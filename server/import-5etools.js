const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const COLLECTIONS = {
  spells: ['spell'],
  items: ['item'],
  monsters: ['monster'],
  classes: ['class'],
  subclasses: ['subclass'],
  races: ['race'],
  backgrounds: ['background'],
  feats: ['feat'],
  rules: ['variantrule'],
  content: [
    'action', 'condition', 'disease', 'hazard', 'language', 'object',
    'optionalfeature', 'reward', 'sense', 'status', 'trap', 'vehicle',
    'variant', 'variantrule', 'recipe', 'deity', 'cult', 'plane', 'table'
  ]
};

const COLLECTION_DIRECTORIES = {
  spells: 'spells',
  items: 'items',
  monsters: 'bestiary',
  classes: 'class',
  subclasses: 'class',
  races: 'races',
  backgrounds: 'backgrounds',
  feats: 'feats',
  rules: 'variantrules',
  content: ''
};

const args = parseArgs(process.argv.slice(2));
let spellSourceMetadata = null;
let activeSubclassFeatureIndex = new Map();
let activeClassFeatureIndex = new Map();

if (!args.data) {
  console.error('Használat: node import-5etools.js --data <5etools>/data [--dry-run]');
  process.exit(1);
}

if (!fs.existsSync(args.data)) {
  console.error(`A data mappa nem található: ${args.data}`);
  process.exit(1);
}

function parseArgs(values) {
  const result = { collections: Object.keys(COLLECTIONS) };

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (value === '--data') result.data = path.resolve(values[++index]);
    if (value === '--collections') result.collections = values[++index].split(',');
    if (value === '--limit') result.limit = Number(values[++index]);
    if (value === '--dry-run') result.dryRun = true;
    if (value === '--replace') result.replace = true;
    if (value === '--init-only') result.initOnly = true;
  }

  return result;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${filePath}: ${error.message}`);
  }
}

function getFiles(dataRoot, collection) {
  const directory = path.join(dataRoot, COLLECTION_DIRECTORIES[collection] || '');
  const candidates = fs.existsSync(directory) ? directory : dataRoot;

  if (collection === 'content') {
    const files = [];

    function visit(currentPath) {
      for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
        const entryPath = path.join(currentPath, entry.name);
        if (entry.isDirectory() && (entry.name === 'node_modules' || entry.name === '.git')) {
          continue;
        }

        if (entry.isDirectory()) {
          visit(entryPath);
        } else if (
          entry.name.toLowerCase().endsWith('.json') &&
          !/^(foundry|fluff-|index)/i.test(entry.name)
        ) {
          files.push(entryPath);
        }
      }
    }

    visit(candidates);
    return files;
  }

  return fs.readdirSync(candidates)
    .filter(file => file.toLowerCase().endsWith('.json'))
    .filter(file => !/^(foundry|fluff-|index)/i.test(file))
    .map(file => path.join(candidates, file));
}

function extractRecords(document, keys) {
  if (Array.isArray(document)) return document;

  return keys.flatMap(key => Array.isArray(document[key]) ? document[key] : []);
}

function collectRecords(dataRoot, collection) {
  const keys = COLLECTIONS[collection];
  const records = [];

  for (const filePath of getFiles(dataRoot, collection)) {
    const document = readJson(filePath);
    const sourceRecords = extractRecords(document, keys);

    for (const record of sourceRecords) {
      records.push({ record, filePath });
    }
  }

  return records;
}

function normalizeFeatureReference(value) {
  return String(value || '').trim().toLowerCase();
}

function getSubclassFeatureKey(feature) {
  return normalizeFeatureReference([
    feature.name,
    feature.subclassShortName,
    feature.subclassSource,
    feature.level
  ].join('|'));
}

// Reference strings look like "Feature Name|ClassName|ClassSource|SubclassShortName|SubclassSource|Level(|Source)"
// Omitted SubclassSource defaults to the enclosing subclass's own source.
function parseSubclassFeatureReferenceKey(value, defaults = {}) {
  const parts = String(value || '').split('|');
  const subclassShortName = parts[3] || defaults.subclassShortName || '';
  const subclassSource = parts[4] || defaults.subclassSource || '';
  const level = parts[5] || '';
  return normalizeFeatureReference([parts[0], subclassShortName, subclassSource, level].join('|'));
}

// Some feature objects only carry a "_copy" pointer and inherit their actual entries from another
// feature object (e.g. a legacy PHB feature re-listed at a new level for the 2024 class).
function resolveCopiedFeature(feature, features, getKey) {
  if (feature.entries || !feature._copy) return feature;

  const copyKey = getKey({ ...feature, ...feature._copy });
  const source = features.get(copyKey);
  if (!source) return feature;

  return { ...source, ...feature, entries: feature.entries || source.entries };
}

function collectSubclassFeatureIndex(dataRoot) {
  const features = new Map();
  const pending = [];

  for (const filePath of getFiles(dataRoot, 'subclasses')) {
    const document = readJson(filePath);

    for (const feature of document.subclassFeature || []) {
      const key = getSubclassFeatureKey(feature);
      if (!key) continue;

      if (feature.entries) {
        features.set(key, feature);
      } else {
        pending.push({ key, feature });
      }
    }
  }

  for (const { key, feature } of pending) {
    if (!features.has(key)) {
      features.set(key, resolveCopiedFeature(feature, features, getSubclassFeatureKey));
    }
  }

  return features;
}

function getSubclassBaseKey(subclass) {
  return normalizeFeatureReference([
    subclass.name,
    subclass.source,
    subclass.classSource
  ].join('|'));
}

function collectSubclassBaseIndex(dataRoot) {
  const subclasses = new Map();

  for (const filePath of getFiles(dataRoot, 'subclasses')) {
    const document = readJson(filePath);

    for (const subclass of document.subclass || []) {
      if (subclass._copy) continue;
      const key = getSubclassBaseKey(subclass);
      if (key) subclasses.set(key, subclass);
    }
  }

  return subclasses;
}

// Base class features (e.g. "Spellcasting|Sorcerer||1") work the same way as subclass features,
// just scoped by className/classSource/level(/source) instead of subclassShortName/subclassSource.
function getClassFeatureKey(feature) {
  return normalizeFeatureReference([
    feature.name,
    feature.className,
    feature.classSource,
    feature.level,
    feature.source
  ].join('|'));
}

// Reference strings look like "Feature Name|ClassName|ClassSource|Level(|Source)"
function parseClassFeatureReferenceKey(value, defaults = {}) {
  const parts = String(value || '').split('|');
  const className = parts[1] || defaults.className || '';
  const classSource = parts[2] || defaults.classSource || '';
  const level = parts[3] || '';
  const source = parts[4] || defaults.classSource || '';
  return normalizeFeatureReference([parts[0], className, classSource, level, source].join('|'));
}

function collectClassFeatureIndex(dataRoot) {
  const features = new Map();
  const pending = [];

  for (const filePath of getFiles(dataRoot, 'classes')) {
    const document = readJson(filePath);

    for (const feature of document.classFeature || []) {
      const key = getClassFeatureKey(feature);
      if (!key) continue;

      if (feature.entries) {
        features.set(key, feature);
      } else {
        pending.push({ key, feature });
      }
    }
  }

  for (const { key, feature } of pending) {
    if (!features.has(key)) {
      features.set(key, resolveCopiedFeature(feature, features, getClassFeatureKey));
    }
  }

  return features;
}

function resolveClassFeatureReferences(value, seenReferences = new Set(), defaults = {}) {
  if (Array.isArray(value)) {
    return value.map(entry => resolveClassFeatureReferences(entry, seenReferences, defaults));
  }

  if (!value || typeof value !== 'object') return value;

  if (value.type === 'refClassFeature' && value.classFeature) {
    const key = parseClassFeatureReferenceKey(value.classFeature, defaults);

    if (seenReferences.has(key)) return '';

    const referencedFeature = activeClassFeatureIndex.get(key);
    if (!referencedFeature) return value;

    const nextSeenReferences = new Set(seenReferences);
    nextSeenReferences.add(key);
    return resolveClassFeatureReferences(referencedFeature, nextSeenReferences, defaults);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      resolveClassFeatureReferences(child, seenReferences, defaults)
    ])
  );
}

function resolveSubclassFeatureReferences(value, seenReferences = new Set(), defaults = {}) {
  if (Array.isArray(value)) {
    return value.map(entry => resolveSubclassFeatureReferences(entry, seenReferences, defaults));
  }

  if (!value || typeof value !== 'object') return value;

  if (value.type === 'refSubclassFeature' && value.subclassFeature) {
    const key = parseSubclassFeatureReferenceKey(value.subclassFeature, defaults);

    if (seenReferences.has(key)) return '';

    const referencedFeature = activeSubclassFeatureIndex.get(key);
    if (!referencedFeature) return value;

    const nextSeenReferences = new Set(seenReferences);
    nextSeenReferences.add(key);
    return resolveSubclassFeatureReferences(referencedFeature, nextSeenReferences, defaults);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      resolveSubclassFeatureReferences(child, seenReferences, defaults)
    ])
  );
}

function sourceFrom(record, filePath) {
  if (record.source || record.sourceJson) {
    return String(record.source || record.sourceJson).toUpperCase();
  }

  const fileName = path.basename(filePath, '.json').toUpperCase();
  return fileName
    .replace(/^SPELLS?-/, '')
    .replace(/^BESTIARY-/, '')
    .replace(/^CLASS-/, '')
    .replace(/^RACES?-/, '')
    .replace(/^BACKGROUNDS?-/, '')
    .replace(/^FEATS?-/, '')
    .replace(/^ITEMS?-/, '');
}

function rulesetFrom(source) {
  const twentyTwentyFourSources = new Set(['XPHB', 'XDMG', 'XMM', 'XPHB2024']);
  return twentyTwentyFourSources.has(source) ? '2024' : '2014';
}

function cleanText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return stripTags(value);
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean).join('\n');
  if (typeof value === 'object') {
    if (value.text) return cleanText(value.text);
    if (value.entries) return cleanText(value.entries);
    if (value.name && value.entry) return `${value.name}: ${cleanText(value.entry)}`;
    if (value.name && value.entries) return `${value.name}: ${cleanText(value.entries)}`;
    if (value.number !== undefined && value.unit) return `${value.number} ${value.unit}`;
    if (value.distance) return cleanText(value.distance);
    if (value.amount !== undefined && value.type) return `${value.amount} ${value.type}`;
    return Object.entries(value)
      .map(([key, child]) => `${key}: ${cleanText(child)}`)
      .join(', ');
  }
  return String(value);
}

function stripTags(value) {
  return value.replace(/\{@[^ ]+\s+([^}|]+)(?:\|[^}]+)?\}/g, '$1').replace(/\{@[^}]+\}/g, '');
}

function parse5eTags(str) {
  if (typeof str !== 'string') return '';
  
  return str
    .replace(/\{@(b|bold)\s+([^}]+)\}/g, '<strong>$2</strong>')
    .replace(/\{@(i|italic)\s+([^}]+)\}/g, '<em>$2</em>')
    .replace(/\{@note\s+([^}]+)\}/g, '<em>Note: $1</em>')
    .replace(/\{@atk\s+mw\}/g, '<em>Melee Attack Roll:</em>')
    .replace(/\{@atk\s+rw\}/g, '<em>Ranged Attack Roll:</em>')
    .replace(/\{@atk\s+m,r\}/g, '<em>Melee or Ranged Attack Roll:</em>')
    .replace(/\{@atk\s+ms\}/g, '<em>Melee Spell Attack:</em>')
    .replace(/\{@atk\s+rs\}/g, '<em>Ranged Spell Attack:</em>')
    .replace(/\{@atk\s+([^}]+)\}/g, '<em>$1 Attack Roll:</em>')
    .replace(/\{@h\}/g, '<em>Hit:</em> ')
    .replace(/\{@dc\s+([^}]+)\}/g, 'DC $1')
    .replace(/\{@recharge\s+([^}]+)\}/g, '(Recharge $1)')
    .replace(/\{@recharge\}/g, '(Recharge 5-6)')
    .replace(/\{@(dice|damage)\s+([^}|]+)(?:\|[^}]+)?\}/g, '$2')
    .replace(/\{@hit\s+\+?([^}]+)\}/g, '+$1')
    .replace(/\{@[^ ]+\s+([^}|]+)(?:\|[^}]+)?\}/g, '$1')
    .replace(/\{@[^}]+\}/g, '');
}

function renderStatblockBody(entry) {
  let html = '';
  const title = entry.name ? `<h3 class="statblock-title">${parse5eTags(entry.name)}</h3>` : '';
  const subtitle = entry.subtitle || entry.type ? `<div class="statblock-subtitle">${parse5eTags(entry.subtitle || entry.type)}</div>` : '';

  let statsHtml = '';
  if (entry.ac !== undefined) {
    const acVal = typeof entry.ac === 'object' ? (entry.ac.ac || cleanText(entry.ac)) : entry.ac;
    statsHtml += `<div class="sb-stat-line"><strong>AC</strong> ${acVal}</div>`;
  }
  if (entry.hp !== undefined) {
    const hpVal = typeof entry.hp === 'object' ? (entry.hp.special || entry.hp.average || cleanText(entry.hp)) : entry.hp;
    statsHtml += `<div class="sb-stat-line"><strong>HP</strong> ${hpVal}</div>`;
  }
  if (entry.speed !== undefined) {
    const speedVal = typeof entry.speed === 'object' ? formatRange(entry.speed) : entry.speed;
    statsHtml += `<div class="sb-stat-line"><strong>Speed</strong> ${speedVal}</div>`;
  }
  if (entry.immunities || entry.conditionImmunities) {
    const imm = [cleanText(entry.immunities), cleanText(entry.conditionImmunities)].filter(Boolean).join('; ');
    if (imm) statsHtml += `<div class="sb-stat-line"><strong>Immunities</strong> ${imm}</div>`;
  }
  if (entry.senses) {
    statsHtml += `<div class="sb-stat-line"><strong>Senses</strong> ${cleanText(entry.senses)}</div>`;
  }
  if (entry.languages) {
    statsHtml += `<div class="sb-stat-line"><strong>Languages</strong> ${cleanText(entry.languages)}</div>`;
  }
  if (entry.cr) {
    statsHtml += `<div class="sb-stat-line"><strong>CR</strong> ${cleanText(entry.cr)}</div>`;
  }

  let abilitiesHtml = '';
  if (entry.str !== undefined || entry.abilities || entry.stats) {
    const abs = entry.abilities || entry.stats || entry;
    const str = abs.str ?? 10, dex = abs.dex ?? 10, con = abs.con ?? 10;
    const int = abs.int ?? 10, wis = abs.wis ?? 10, cha = abs.cha ?? 10;

    const calcMod = (score) => {
      const mod = Math.floor((score - 10) / 2);
      return mod >= 0 ? `+${mod}` : `${mod}`;
    };

    abilitiesHtml = `
      <div class="sb-card-abilities">
        <div class="sb-ability-col"><span class="sb-abil-name">STR</span><span class="sb-abil-val">${str} (${calcMod(str)})</span></div>
        <div class="sb-ability-col"><span class="sb-abil-name">DEX</span><span class="sb-abil-val">${dex} (${calcMod(dex)})</span></div>
        <div class="sb-ability-col"><span class="sb-abil-name">CON</span><span class="sb-abil-val">${con} (${calcMod(con)})</span></div>
        <div class="sb-ability-col"><span class="sb-abil-name">INT</span><span class="sb-abil-val">${int} (${calcMod(int)})</span></div>
        <div class="sb-ability-col"><span class="sb-abil-name">WIS</span><span class="sb-abil-val">${wis} (${calcMod(wis)})</span></div>
        <div class="sb-ability-col"><span class="sb-abil-name">CHA</span><span class="sb-abil-val">${cha} (${calcMod(cha)})</span></div>
      </div>
    `;
  }

  let contentHtml = '';
  if (entry.traits && entry.traits.length > 0) {
    contentHtml += `<div class="sb-card-section-title">Traits</div>${convertEntryToHtml(entry.traits)}`;
  }
  if (entry.actions && entry.actions.length > 0) {
    contentHtml += `<div class="sb-card-section-title">Actions</div>${convertEntryToHtml(entry.actions)}`;
  }
  if (entry.entries && entry.entries.length > 0) {
    contentHtml += convertEntryToHtml(entry.entries);
  }

  return `
    <div class="statblock-card">
      <div class="statblock-header">
        ${title}
        ${subtitle}
      </div>
      <div class="statblock-hr"></div>
      ${statsHtml ? `<div class="sb-stats">${statsHtml}</div>` : ''}
      ${abilitiesHtml}
      ${contentHtml}
    </div>
  `;
}

function convertEntryToHtml(entry) {
  if (entry === null || entry === undefined) return '';
  if (typeof entry === 'string') return `<p>${parse5eTags(entry)}</p>`;
  if (Array.isArray(entry)) {
    return entry.map(convertEntryToHtml).filter(Boolean).join('\n');
  }

  if (typeof entry === 'object') {
    const type = entry.type;

    if (type === 'inset' || type === 'insetReadaloud' || type === 'statblockInline' || type === 'statblock') {
      return renderStatblockBody(entry);
    }

    if (type === 'table') {
      const caption = entry.caption ? `<caption class="table-caption">${parse5eTags(entry.caption)}</caption>` : '';
      let thead = '';
      if (Array.isArray(entry.colLabels) && entry.colLabels.length > 0) {
        const ths = entry.colLabels.map(col => `<th>${parse5eTags(cleanText(col))}</th>`).join('');
        thead = `<thead><tr>${ths}</tr></thead>`;
      }

      let tbody = '';
      if (Array.isArray(entry.rows)) {
        const trs = entry.rows.map(row => {
          if (!Array.isArray(row)) return '';
          const tds = row.map(cell => {
            const cellText = typeof cell === 'object' && cell.entry ? cell.entry : cell;
            return `<td>${parse5eTags(cleanText(cellText))}</td>`;
          }).join('');
          return `<tr>${tds}</tr>`;
        }).join('');
        tbody = `<tbody>${trs}</tbody>`;
      }

      return `<div class="entry-table-wrapper"><table class="entry-table">${caption}${thead}${tbody}</table></div>`;
    }

    if (type === 'list') {
      const items = Array.isArray(entry.items)
        ? entry.items.map(item => `<li>${parse5eTags(cleanText(item))}</li>`).join('')
        : '';
      return `<ul class="entry-list">${items}</ul>`;
    }

    if (type === 'options') {
      return `<ul class="entry-list">${convertEntryToHtml(entry.entries)}</ul>`;
    }

    if (type === 'refOptionalfeature' && entry.optionalfeature) {
      const name = String(entry.optionalfeature).split('|')[0];
      return `<li>${parse5eTags(name)}</li>`;
    }

    if (type === 'quote') {
      const content = convertEntryToHtml(entry.entries);
      const by = entry.by ? `<footer>— ${parse5eTags(entry.by)}</footer>` : '';
      return `<blockquote class="entry-quote">${content}${by}</blockquote>`;
    }

    if (type === 'entries' || (!type && entry.entries)) {
      const header = entry.name ? `<h4>${parse5eTags(entry.name)}</h4>` : '';
      const content = convertEntryToHtml(entry.entries);
      return `<div class="entry-block">${header}${content}</div>`;
    }

    if (entry.name && (entry.entry || entry.entries)) {
      const textHtml = convertEntryToHtml(entry.entry || entry.entries);
      return `<p><strong>${parse5eTags(entry.name)}.</strong> ${textHtml.replace(/^<p>|<\/p>$/g, '')}</p>`;
    }
  }

  return `<p>${parse5eTags(cleanText(entry))}</p>`;
}

function entryText(value) {
  if (!value) return '';
  return convertEntryToHtml(value);
}

function firstText(value) {
  return cleanText(Array.isArray(value) ? value[0] : value);
}

function formatTime(value) {
  if (Array.isArray(value)) return value.map(formatTime).filter(Boolean).join(', ');
  if (!value || typeof value !== 'object') return cleanText(value);

  const number = value.number ? `${value.number} ` : '';
  const unit = cleanText(value.unit || value.type);
  return `${number}${unit}`.trim();
}

function formatRange(value, pluralizeUnits = false) {
  if (Array.isArray(value)) return value.map(formatRange).filter(Boolean).join(', ');
  if (!value || typeof value !== 'object') return cleanText(value);

  const distance = value.distance || value;
  if (typeof distance === 'object') {
    const amountValue = distance.amount;
    const amount = amountValue !== undefined ? `${amountValue} ` : '';
    const unit = cleanText(distance.type || distance.unit);
    const pluralUnit = pluralizeUnits && Number(amountValue) !== 1 && unit && !unit.endsWith('s')
      ? `${unit}s`
      : unit;
    return `${amount}${pluralUnit}`.trim();
  }

  return cleanText(distance);
}

function formatDuration(value) {
  if (Array.isArray(value)) return value.map(formatDuration).filter(Boolean).join(', ');
  if (!value || typeof value !== 'object') return cleanText(value);

  const type = String(value.type || '').toLowerCase();
  if (type === 'instant') return 'Instant';
  if (type === 'permanent') return 'Permanent';

  const duration = value.duration || value.amount || value.value;
  const formattedDuration = formatRange(duration || value, true);
  if (!formattedDuration) return type ? type[0].toUpperCase() + type.slice(1) : '';

  return value.concentration
    ? `Concentration, ${formattedDuration}`
    : formattedDuration;
}

function featureList(value) {
  if (!Array.isArray(value)) return [];

  return value.map(feature => ({
    title: cleanText(feature?.name || feature?.title || feature),
    name: cleanText(feature?.name || feature?.title || feature),
    level: feature?.level,
    description: entryText(feature?.entries || feature?.entry || feature?.description || feature)
  }));
}

function classNames(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(item => cleanText(item?.name || item));

  return [
    ...(value.fromClassList || []),
    ...(value.fromSubclass || []),
    ...(value.fromSubclassList || [])
  ].map(item => cleanText(item?.name || item));
}

function listText(value) {
  return cleanText(value);
}

function getSpellClasses(record, source, filePath) {
  if (!spellSourceMetadata) {
    const metadataPath = path.join(path.dirname(filePath), 'sources.json');
    spellSourceMetadata = fs.existsSync(metadataPath) ? readJson(metadataPath) : {};
  }

  const sourceRecord = spellSourceMetadata[source]?.[record.name];
  const classes = sourceRecord?.class || [];
  return classes.map(item => cleanText(item.name || item)).filter(Boolean);
}

function normalizeSpell(record, source, filePath) {
  const time = formatTime(record.time);
  const range = formatRange(record.range);
  const duration = formatDuration(record.duration);
  const classes = classNames(record.classes);
  const mappedClasses = Array.from(new Set(
    (classes.length > 0 ? classes : getSpellClasses(record, source, filePath))
      .map(item => item.trim())
      .filter(Boolean)
  ));
  const components = Object.keys(record.components || {})
    .filter(key => record.components[key])
    .map(key => key.toUpperCase())
    .join(', ');

  return {
    level: Number(record.level ?? record.spellLevel ?? 0),
    school: cleanText(record.school),
    castingTime: time,
    range,
    duration,
    components,
    componentsText: components,
    classes: mappedClasses,
    classesText: mappedClasses.join(', '),
    description: entryText(record.entries),
    higherLevels: entryText(record.entriesHigherLevel),
    ritual: Boolean(record.meta?.ritual),
    damageTypes: record.damageInflict || [],
    savingThrows: record.savingThrow || [],
    source,
    page: record.page
  };
}

function normalizeItem(record, source) {
  return {
    category: cleanText(record.category || record.type || record.weaponCategory || record.armorCategory),
    rarity: cleanText(record.rarity),
    cost: cleanText(record.value || record.cost),
    weight: cleanText(record.weight),
    requiresAttunement: Boolean(record.reqAttune || record.requiresAttunement),
    weaponCategory: cleanText(record.weaponCategory),
    damage: cleanText(record.dmg1 || record.dmg2),
    armorClass: cleanText(record.ac || record.armor),
    properties: listText(record.property),
    description: entryText(record.entries),
    source,
    page: record.page
  };
}

function normalizeClass(record, source, classFeatureIndex = new Map()) {
  const featureDefaults = { className: record.name, classSource: source };
  const featureReferences = record.classFeatures || record.features || [];
  const resolvedFeatures = featureReferences
    .map(feature => {
      if (typeof feature === 'string') {
        return classFeatureIndex.get(parseClassFeatureReferenceKey(feature, featureDefaults)) || feature;
      }
      if (feature && typeof feature === 'object' && feature.classFeature) {
        // "gainSubclassFeature" markers just mean "you gain a subclass feature here", not a class feature.
        if (feature.gainSubclassFeature) return null;
        return classFeatureIndex.get(parseClassFeatureReferenceKey(feature.classFeature, featureDefaults)) || feature;
      }
      return feature;
    })
    .filter(Boolean)
    .map(feature => resolveClassFeatureReferences(feature, new Set(), featureDefaults));

  const features = featureList(resolvedFeatures);

  return {
    shortDescription: entryText(record.fluff?.entries || record.entries?.slice?.(0, 1)),
    description: entryText(record.entries),
    hitPoints: {
      hitDice: record.hd ? `1d${record.hd.faces || record.hd.number || record.hd}` : '',
      firstLevel: cleanText(record.startingProficiencies?.hitPoints || record.hpAt1stLevel),
      higherLevels: cleanText(record.hpAtHigherLevels)
    },
    proficiencies: {
      armor: listText(record.startingProficiencies?.armor),
      weapons: listText(record.startingProficiencies?.weapons),
      tools: listText(record.startingProficiencies?.tools),
      savingThrows: listText(record.proficiency || record.savingThrow),
      skills: listText(record.startingProficiencies?.skills)
    },
    equipment: record.startingEquipment || record.equipment || [],
    features,
    classTable: record.classTable || [],
    classTableColumns: record.classTableColumns || [],
    subclassRefs: record.subclass?.map?.(item => ({
      id: cleanText(item.name || item),
      name: cleanText(item.name || item)
    })) || [],
    source,
    page: record.page
  };
}

function normalizeSubclass(record, source, subclassFeatureIndex, subclassBaseIndex = new Map()) {
  const featureDefaults = { subclassShortName: record.shortName, subclassSource: source };
  const featureReferences = record.subclassFeatures || record.features || [];
  const features = featureReferences.map(feature => {
    if (typeof feature !== 'string') return feature;
    return subclassFeatureIndex.get(parseSubclassFeatureReferenceKey(feature, featureDefaults)) || feature;
  }).map(feature => resolveSubclassFeatureReferences(feature, new Set(), featureDefaults));

  // A record with a "_copy" pointer (e.g. a legacy subclass re-listed for the 2024 class) has no
  // description of its own; pull it from the base subclass it copies.
  const baseRecord = record._copy ? subclassBaseIndex.get(getSubclassBaseKey(record._copy)) : null;
  const entries = record.entries || baseRecord?.entries;

  const isPhb = source === 'PHB' || source === 'XPHB';

  return {
    shortDescription: entryText(record.fluff?.entries || entries?.slice?.(0, 1)),
    description: entryText(entries),
    classId: cleanText(record.className),
    className: cleanText(record.className),
    classSource: cleanText(record.classSource || ''),
    features: featureList(features),
    tableRows: record.subclassTable || [],
    tableColumns: record.subclassTableColumns || [],
    isPhb,
    bookGroup: isPhb ? 'phb' : 'expanded',
    source,
    page: record.page
  };
}

function normalizeRace(record, source) {
  const traits = featureList(record.entries);

  return {
    shortDescription: entryText(record.fluff?.entries || record.entries?.slice?.(0, 1)),
    description: entryText(record.entries),
    abilityScoreIncrease: listText(record.ability || record.abilityScoreIncrease),
    size: cleanText(record.size),
    speed: cleanText(record.speed),
    languages: listText(record.languageProficiencies || record.languages),
    traits,
    subraces: record.subraces || [],
    source,
    page: record.page
  };
}

function normalizeBackground(record, source) {
  return {
    shortDescription: entryText(record.entries?.slice?.(0, 1)),
    description: entryText(record.entries),
    skillProficiencies: listText(record.skillProficiencies),
    toolProficiencies: listText(record.toolProficiencies),
    languages: listText(record.languageProficiencies || record.languages),
    equipment: listText(record.startingEquipment || record.equipment),
    feature: record.feature || null,
    characteristics: record.characteristics || [],
    source,
    page: record.page
  };
}

function normalizeFeat(record, source) {
  return {
    shortDescription: entryText(record.entries?.slice?.(0, 1)),
    description: entryText(record.entries),
    prerequisite: listText(record.prerequisite),
    benefits: record.benefits || [],
    source,
    page: record.page
  };
}

function normalizeRule(record, source) {
  return {
    category: cleanText(record.category || 'General'),
    shortDescription: entryText(record.entries?.slice?.(0, 1)),
    description: entryText(record.entries),
    summary: entryText(record.entries?.slice?.(0, 1)),
    examples: record.examples || [],
    steps: record.steps || [],
    relatedRules: record.relatedRules || [],
    source,
    page: record.page
  };
}

function normalizeMonster(record, source) {
  const traits = (record.trait || []).map(feature => ({
    name: cleanText(feature.name),
    description: entryText(feature.entries)
  }));
  const actions = (record.action || []).map(feature => ({
    name: cleanText(feature.name),
    description: entryText(feature.entries)
  }));
  const legendaryActions = (record.legendary || []).map(feature => ({
    name: cleanText(feature.name),
    description: entryText(feature.entries)
  }));

  return {
    size: cleanText(record.size),
    type: cleanText(record.type),
    alignment: cleanText(record.alignment),
    challengeRating: cleanText(record.cr),
    armorClass: Array.isArray(record.ac) ? Number(record.ac[0]?.ac || 0) : Number(record.ac || 0),
    hitPoints: Number(record.hp?.average || record.hp || 0),
    speed: cleanText(record.speed),
    shortDescription: entryText(record.entries?.slice?.(0, 1)),
    abilities: {
      str: record.str, dex: record.dex, con: record.con,
      int: record.int, wis: record.wis, cha: record.cha
    },
    savingThrows: cleanText(record.save),
    skills: cleanText(record.skill),
    damageResistances: cleanText(record.resist),
    damageImmunities: cleanText(record.immune),
    conditionImmunities: cleanText(record.conditionImmune),
    senses: cleanText(record.senses),
    languages: cleanText(record.languages),
    traits,
    actions,
    legendaryActions,
    description: entryText(record.entries),
    source,
    page: record.page
  };
}

function normalizeGeneric(record, source) {
  const data = { ...record };
  delete data.name;
  delete data.source;
  delete data.page;
  delete data._copy;

  return {
    shortDescription: entryText(record.entries?.slice?.(0, 1)),
    description: entryText(record.entries),
    source,
    page: record.page,
    ...data
  };
}

function normalizeRecord(collection, record, filePath, subclassFeatureIndex = new Map(), subclassBaseIndex = new Map(), classFeatureIndex = new Map()) {
  const source = sourceFrom(record, filePath);
  // Subclasses can be duplicated per class edition (e.g. a PHB subclass re-listed under classSource XPHB
  // for the 2024 class); the class edition must drive the ruleset/id, not the subclass's own book source.
  const classSource = collection === 'subclasses' ? cleanText(record.classSource || source) : source;
  const ruleset = rulesetFrom(collection === 'subclasses' ? classSource : source);
  const name = cleanText(record.name || 'Unnamed');
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const type = collection === 'content' ? 'content' : COLLECTIONS[collection][0];
  const id = collection === 'subclasses'
    ? `${slug}_${source.toLowerCase()}_${classSource.toLowerCase()}_${ruleset}`
    : `${slug}_${source.toLowerCase()}_${ruleset}`;
  let data = normalizeGeneric(record, source);

  switch (collection) {
    case 'spells':
      data = normalizeSpell(record, source, filePath);
      break;
    case 'items':
      data = normalizeItem(record, source);
      break;
    case 'monsters':
      data = normalizeMonster(record, source);
      break;
    case 'classes':
      data = normalizeClass(record, source, classFeatureIndex);
      break;
    case 'subclasses':
      data = normalizeSubclass(record, source, subclassFeatureIndex, subclassBaseIndex);
      break;
    case 'races':
      data = normalizeRace(record, source);
      break;
    case 'backgrounds':
      data = normalizeBackground(record, source);
      break;
    case 'feats':
      data = normalizeFeat(record, source);
      break;
    case 'rules':
      data = normalizeRule(record, source);
      break;
  }

  return {
    id,
    name,
    type,
    sourceType: 'system',
    source,
    ruleset,
    data,
    searchText: `${name} ${collection} ${source} ${ruleset} ${cleanText(data.description)}`.toLowerCase()
  };
}

function removeUndefined(value, nestedInArray = false) {
  if (Array.isArray(value)) {
    return value
      .filter(child => child !== undefined)
      .map(child => {
        if (Array.isArray(child)) {
          return { values: removeUndefined(child, true) };
        }

        return removeUndefined(child, true);
      });
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child !== undefined)
        .map(([key, child]) => [key, removeUndefined(child, nestedInArray)])
    );
  }

  return value;
}

async function upload(collection, records) {
  const db = admin.firestore();
  const chunkSize = 400;

  for (let start = 0; start < records.length; start += chunkSize) {
    const batch = db.batch();
    const chunk = records.slice(start, start + chunkSize);

    for (const item of chunk) {
      const ref = db.collection(collection).doc(item.id);
      batch.set(ref, removeUndefined(item), { merge: !args.replace });
    }

    await batch.commit();
  }
}

async function clearCollection(db, collection) {
  const snapshot = await db.collection(collection).get();

  for (let start = 0; start < snapshot.docs.length; start += 400) {
    const batch = db.batch();
    snapshot.docs.slice(start, start + 400).forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function initializeFirestoreStructure(db, collections) {
  const batch = db.batch();
  const catalogRef = db.collection('systemCatalog').doc('structure');

  batch.set(catalogRef, {
    name: '5eTools system content',
    sourceType: 'system',
    collections,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  for (const collection of collections) {
    const collectionRef = db.collection('systemCatalog').doc('collections').collection('items').doc(collection);
    batch.set(collectionRef, {
      collection,
      contentCollection: collection,
      contentType: COLLECTIONS[collection][0],
      sourceType: 'system',
      path: `${COLLECTION_DIRECTORIES[collection]}/`,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  await batch.commit();
}

async function main() {
  if (!args.dryRun) {
    admin.initializeApp({
      credential: admin.credential.cert(path.join(__dirname, 'firebase-key.json'))
    });

    const db = admin.firestore();
    await initializeFirestoreStructure(db, args.collections.filter(collection => COLLECTIONS[collection]));
    console.log('Firestore struktúra létrehozva/frissítve: systemCatalog');

    if (args.initOnly) {
      await admin.app().delete();
      return;
    }
  }

  const subclassFeatureIndex = args.collections.includes('subclasses')
    ? collectSubclassFeatureIndex(args.data)
    : new Map();
  activeSubclassFeatureIndex = subclassFeatureIndex;

  const subclassBaseIndex = args.collections.includes('subclasses')
    ? collectSubclassBaseIndex(args.data)
    : new Map();

  const classFeatureIndex = args.collections.includes('classes')
    ? collectClassFeatureIndex(args.data)
    : new Map();
  activeClassFeatureIndex = classFeatureIndex;

  for (const collection of args.collections) {
    if (!COLLECTIONS[collection]) {
      console.warn(`Ismeretlen kollekció kihagyva: ${collection}`);
      continue;
    }

    const rawRecords = collectRecords(args.data, collection);
    const records = rawRecords
      .map(item => normalizeRecord(collection, item.record, item.filePath, subclassFeatureIndex, subclassBaseIndex, classFeatureIndex))
      .slice(0, args.limit || Infinity);

    console.log(`${collection}: ${records.length} rekord`);

    if (args.dryRun && records[0]) {
      console.log(JSON.stringify(records[0], null, 2));
    } else if (!args.dryRun) {
      if (args.replace) {
        await clearCollection(admin.firestore(), collection);
      }
      await upload(collection, records);
    }
  }

  if (!args.dryRun) {
    await admin.app().delete();
  }
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch(error => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

module.exports = {
  collectRecords,
  normalizeRecord,
  collectSubclassFeatureIndex,
  collectSubclassBaseIndex,
  collectClassFeatureIndex,
  setActiveSubclassFeatureIndex: map => { activeSubclassFeatureIndex = map; },
  setActiveClassFeatureIndex: map => { activeClassFeatureIndex = map; }
};