import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export function formatDescriptionHtml(text: string | null | undefined): string {
  if (!text) return '';

  let raw = String(text).trim();

  // If text already has pre-formatted statblock or table HTML structures
  if (
    raw.includes('class="statblock-card"') ||
    raw.includes('class="entry-table') ||
    raw.includes('<table') ||
    raw.includes('class="statblock-title"')
  ) {
    return raw;
  }

  // Convert raw serialized tables like "type: table, caption: ..." into HTML tables first!
  raw = convertSerializedTables(raw);

  // If text is ALL CAPS, convert it to normal sentence case first
  raw = fixAllCapsText(raw);

  // Parse 5e tags like {@b ...}, {@i ...}, {@atk ...}, {@h}, {@dc ...}, {@dice ...}
  raw = parse5eTagsInText(raw);

  // Convert markdown bolding and italics
  raw = raw
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>');

  // Check if text contains a statblock pattern (e.g., Animated Object, summoned creatures)
  if (hasStatblockPattern(raw)) {
    return parseStatblocksInText(raw);
  }

  // If text contains markdown table patterns
  if (raw.includes('|---') || (raw.includes('|') && raw.includes('\n'))) {
    raw = convertMarkdownTables(raw);
  }

  // Convert double newlines to paragraphs, single to <br>
  return convertToParagraphs(raw);
}

function convertSerializedTables(raw: string): string {
  if (!raw.includes('type: table') && !raw.includes('type: "table"') && !raw.includes('colLabels:')) {
    return raw;
  }

  const tablePattern = /type:\s*"?table"?,?[\s\S]*?rows:\s*([\s\S]*?)(?=\n\s*\n\s*[A-Z]|\n\s*\n\s*$|An animated object|At Higher Levels|Using a Higher-Level|$)/gi;

  return raw.replace(tablePattern, (fullMatch: string) => {
    // Extract caption if present
    const captionMatch = fullMatch.match(/caption:\s*([^,\n]+)/i);
    const caption = captionMatch ? captionMatch[1].trim() : 'Animated Object Statistics';

    // Extract headers
    let headers = ['Size', 'HP', 'AC', 'Attack', 'Str', 'Dex'];
    const colLabelsMatch = fullMatch.match(/colLabels:\s*([\s\S]*?)(?=colStyles:|rows:)/i);
    if (colLabelsMatch) {
      const labels = colLabelsMatch[1]
        .split(/[\n,]+/)
        .map((s: string) => s.trim())
        .filter(Boolean);
      if (labels.length >= 3) {
        headers = labels;
      }
    }

    // Extract rows text
    const rowsIndex = fullMatch.indexOf('rows:');
    const rowsText = rowsIndex !== -1 ? fullMatch.substring(rowsIndex + 5) : '';

    const rowsHtml = buildSerializedTableRows(rowsText, headers.length);

    const ths = headers.map((h: string) => `<th>${h}</th>`).join('');

    return `\n\n<div class="entry-table-wrapper"><table class="entry-table">${caption ? `<caption>${caption}</caption>` : ''}<thead><tr>${ths}</tr></thead><tbody>${rowsHtml}</tbody></table></div>\n\n`;
  });
}

function buildSerializedTableRows(rowsStr: string, numCols: number = 6): string {
  if (!rowsStr) return '';

  const cleanLines = rowsStr
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0 && !l.startsWith('type:') && !l.startsWith('colStyles:'));

  let rowsHtml = '';

  if (cleanLines.length >= numCols && cleanLines.length % numCols === 0) {
    for (let i = 0; i < cleanLines.length; i += numCols) {
      const chunk = cleanLines.slice(i, i + numCols);
      const name = chunk[0].replace(/\b[a-z]/g, (c: string) => c.toUpperCase());
      rowsHtml += `<tr><td><strong>${name}</strong></td><td>${chunk[1]}</td><td>${chunk[2]}</td><td>${chunk[3]}</td><td>${chunk[4]}</td><td>${chunk[5] || '-'}</td></tr>`;
    }
    return rowsHtml;
  }

  // Fallback: try regex matching
  const rowPattern = /(animated object \([a-z]+\)|[a-z]+)[\s\n]+(\d+)[\s\n]+(\d+)[\s\n]+([\+\-\d\s\w,]+?(?:hit|damage|attack))[\s\n]+([\+\-\d\s\w\(\)]+?)[\s\n]+([\+\-\d\s\w\(\)]+)(?=$|animated object \(|\b(?:tiny|small|medium|large|huge|gargantuan)\b)/gi;

  let match: RegExpExecArray | null;
  while ((match = rowPattern.exec(rowsStr)) !== null) {
    const [, name, hp, ac, attack, strVal, dexVal] = match;
    const formattedName = name
      .toLowerCase()
      .replace(/\b[a-z]/g, (c: string) => c.toUpperCase());

    rowsHtml += `<tr><td><strong>${formattedName}</strong></td><td>${hp}</td><td>${ac}</td><td>${attack}</td><td>${strVal}</td><td>${dexVal}</td></tr>`;
  }

  if (!rowsHtml) {
    rowsHtml = `<tr><td colspan="${numCols}">${rowsStr.trim()}</td></tr>`;
  }

  return rowsHtml;
}

function fixAllCapsText(text: string): string {
  if (!text) return '';
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length > 15) {
    const upperCount = (text.match(/[A-Z]/g) || []).length;
    if (upperCount / letters.length > 0.75) {
      return text
        .toLowerCase()
        .replace(/(^\s*|[.\!?]\s+)([a-z])/g, (m: string, p1: string, p2: string) => p1 + p2.toUpperCase())
        .replace(/\bac\b/gi, 'AC')
        .replace(/\bhp\b/gi, 'HP')
        .replace(/\bcr\b/gi, 'CR')
        .replace(/\bstr\b/gi, 'STR')
        .replace(/\bdex\b/gi, 'DEX')
        .replace(/\bcon\b/gi, 'CON')
        .replace(/\bint\b/gi, 'INT')
        .replace(/\bwis\b/gi, 'WIS')
        .replace(/\bcha\b/gi, 'CHA')
        .replace(/\bsave\b/gi, 'SAVE')
        .replace(/\bmod\b/gi, 'MOD')
        .replace(/\bxp\b/gi, 'XP')
        .replace(/\bpb\b/gi, 'PB')
        .replace(/\b(huge|large|medium|small|tiny|construct|beast|dragon|fiend|undead|elemental|monstrosity|aberration|fey|giant|humanoid|plant|ooze)\b/gi, 
          (m: string) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase());
    }
  }
  return text;
}

function hasStatblockPattern(text: string): boolean {
  return (
    (text.includes('AC ') || text.includes('Armor Class')) &&
    (text.includes('HP ') || text.includes('Hit Points')) &&
    (text.includes('Speed') || text.includes('STR'))
  );
}

function parseStatblocksInText(text: string): string {
  // Split into paragraph blocks
  const blocks = text.split(/\n\s*\n/);
  const result: string[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    if (hasStatblockPattern(trimmed)) {
      result.push(renderStatblockCard(trimmed));
    } else {
      result.push(convertToParagraphs(trimmed));
    }
  }

  return result.join('');
}

function renderStatblockCard(text: string): string {
  const clean = text.replace(/\r/g, '').trim();

  // Find index positions of major markers
  const acMatch = clean.match(/(?:AC|Armor Class)[:\s]+(\d+[^\n\.]*)/i);
  const hpMatch = clean.match(/(?:HP|Hit Points)[:\s]+(\d+[^\n\.]*(?:\([^\)]+\)[^\n\.]*)?)/i);
  const speedMatch = clean.match(/Speed[:\s]+(\d+[^\n\.]*)/i);

  const acIdx = clean.search(/(?:AC|Armor Class)[:\s]+/i);

  // 1. Header (Title + Subtitle) - everything before acIdx
  const headerText = acIdx !== -1 ? clean.substring(0, acIdx).trim() : '';
  let title = 'ANIMATED OBJECT';
  let subtitle = '';

  if (headerText) {
    const sizeTypeMatch = headerText.match(/^(.*?)\s*\b(Tiny|Small|Medium|Large|Huge|Gargantuan|Huge or [A-Za-z\s]+|Construct|Beast|Fiend|Undead|Elemental|Monstrosity|Aberration|Dragon|Fey|Giant|Humanoid|Plant|Ooze)[,\s]+(.*)$/i);
    if (sizeTypeMatch) {
      title = sizeTypeMatch[1].trim() || 'ANIMATED OBJECT';
      subtitle = `${sizeTypeMatch[2]}, ${sizeTypeMatch[3]}`.trim();
    } else {
      const firstDot = headerText.indexOf('.');
      if (firstDot !== -1 && firstDot < 40) {
        title = headerText.substring(0, firstDot).trim();
        subtitle = headerText.substring(firstDot + 1).trim();
      } else {
        title = headerText;
      }
    }
  }

  title = title.replace(/[:\-]+$/, '').trim();

  // 2. Extract AC, HP, Speed
  const acVal = acMatch ? acMatch[1].trim() : '';
  const hpVal = hpMatch ? hpMatch[1].trim() : '';
  const speedVal = speedMatch ? speedMatch[1].trim() : '';

  // 3. Extract Immunities, Senses, Languages, CR
  const immunitiesMatch = clean.match(/(?:Immunities|Condition Immunities|Damage Immunities)[:\s]+([^SLC\n]+?)(?=\s*(?:Senses|Languages|CR|Actions|\bSTR\b|$))/i);
  const sensesMatch = clean.match(/Senses[:\s]+([^LC\n]+?)(?=\s*(?:Languages|CR|Actions|\bSTR\b|$))/i);
  const languagesMatch = clean.match(/Languages[:\s]+([^C\n]+?)(?=\s*(?:CR|Actions|\bSTR\b|$))/i);
  const crMatch = clean.match(/(?:CR|Challenge)[:\s]+([^A\n]+?)(?=\s*(?:Actions|\bSTR\b|$))/i);

  const immunitiesVal = immunitiesMatch ? immunitiesMatch[1].trim().replace(/[,;]+$/, '') : '';
  const sensesVal = sensesMatch ? sensesMatch[1].trim().replace(/[,;]+$/, '') : '';
  const languagesVal = languagesMatch ? languagesMatch[1].trim().replace(/[,;]+$/, '') : '';
  const crVal = crMatch ? crMatch[1].trim().replace(/[,;]+$/, '') : '';

  const formattedImmunities = highlightConditions(immunitiesVal);
  const formattedSenses = highlightSenses(sensesVal);

  // 4. Ability Scores
  const abilities = extractAbilities(clean);

  // 5. Actions section
  const actionsIdx = clean.search(/\bActions\b/i);
  let actionsText = '';
  if (actionsIdx !== -1) {
    actionsText = clean.substring(actionsIdx + 7).trim();
  } else {
    const slamIdx = clean.search(/\b(?:Slam|Attack|Melee|Ranged)\b/i);
    if (slamIdx !== -1 && slamIdx > (clean.search(/\bSTR\b/i) !== -1 ? clean.search(/\bSTR\b/i) : acIdx)) {
      actionsText = clean.substring(slamIdx).trim();
    }
  }

  return `
    <div class="statblock-card">
      <div class="statblock-header">
        <h3 class="statblock-title">${title}</h3>
        ${subtitle ? `<div class="statblock-subtitle">${subtitle}</div>` : ''}
      </div>
      <div class="statblock-hr"></div>

      <div class="sb-card-grid">
        <div class="sb-card-left">
          ${acVal ? `<div class="sb-stat-line"><strong>AC</strong> ${acVal}</div>` : ''}
          ${hpVal ? `<div class="sb-stat-line"><strong>HP</strong> ${hpVal}</div>` : ''}
          ${speedVal ? `<div class="sb-stat-line"><strong>Speed</strong> ${speedVal}</div>` : ''}
        </div>
        <div class="sb-card-right">
          ${formattedImmunities ? `<div class="sb-stat-line"><strong>Immunities</strong> ${formattedImmunities}</div>` : ''}
          ${formattedSenses ? `<div class="sb-stat-line"><strong>Senses</strong> ${formattedSenses}</div>` : ''}
          ${languagesVal ? `<div class="sb-stat-line"><strong>Languages</strong> ${languagesVal}</div>` : ''}
          ${crVal ? `<div class="sb-stat-line"><strong>CR</strong> ${crVal}</div>` : ''}
        </div>
      </div>

      ${abilities ? renderAbilitiesTable(abilities) : ''}

      ${actionsText ? `
        <div class="sb-card-section-title">Actions</div>
        <div class="sb-card-entry">${formatActionText(actionsText)}</div>
      ` : ''}
    </div>
  `;
}

interface AbilityData {
  score: number;
  mod: string;
  save?: string;
}

function extractAbilities(text: string): Record<string, AbilityData> | null {
  const getAbil = (name: string) => {
    const reg = new RegExp(`\\b${name}\\s*(\\d+)(?:\\s*\\(([+-]?\\d+)\\))?(?:\\s*SAVE\\s*([+-]?\\d+))?`, 'i');
    const m = text.match(reg);
    if (!m) return null;
    const score = parseInt(m[1], 10);
    const mod = m[2] ? (m[2].startsWith('+') || m[2].startsWith('-') ? m[2] : `+${m[2]}`) : (Math.floor((score - 10) / 2) >= 0 ? `+${Math.floor((score - 10) / 2)}` : `${Math.floor((score - 10) / 2)}`);
    const save = m[3] ? (m[3].startsWith('+') || m[3].startsWith('-') ? m[3] : `+${m[3]}`) : undefined;
    return { score, mod, save };
  };

  const str = getAbil('STR');
  const dex = getAbil('DEX');
  const con = getAbil('CON');
  const int = getAbil('INT');
  const wis = getAbil('WIS');
  const cha = getAbil('CHA');

  if (str && dex && con && int && wis && cha) {
    return { STR: str, DEX: dex, CON: con, INT: int, WIS: wis, CHA: cha };
  }
  return null;
}

function renderAbilitiesTable(abs: Record<string, AbilityData>): string {
  const renderRow = (name: string, data: AbilityData) => `
    <div class="sb-abil-table-row">
      <span class="col-abil"><strong>${name}</strong> ${data.score}</span>
      <span class="col-val shaded">${data.mod}</span>
      <span class="col-val shaded">${data.save || data.mod}</span>
    </div>
  `;

  return `
    <div class="sb-abilities-grid">
      <div class="sb-abil-table-col">
        <div class="sb-abil-table-header">
          <span class="col-abil"></span>
          <span class="col-lbl">MOD</span>
          <span class="col-lbl">SAVE</span>
        </div>
        ${renderRow('STR', abs.STR)}
        ${renderRow('DEX', abs.DEX)}
        ${renderRow('CON', abs.CON)}
      </div>
      <div class="sb-abil-table-col">
        <div class="sb-abil-table-header">
          <span class="col-abil"></span>
          <span class="col-lbl">MOD</span>
          <span class="col-lbl">SAVE</span>
        </div>
        ${renderRow('INT', abs.INT)}
        ${renderRow('WIS', abs.WIS)}
        ${renderRow('CHA', abs.CHA)}
      </div>
    </div>
  `;
}

function highlightConditions(text: string): string {
  if (!text) return '';
  const conditions = [
    'Charmed', 'Exhaustion', 'Frightened', 'Paralyzed', 'Poisoned',
    'Blinded', 'Deafened', 'Grappled', 'Incapacitated', 'Prone',
    'Restrained', 'Stunned', 'Unconscious', 'Petrified'
  ];

  let result = text;
  for (const cond of conditions) {
    const reg = new RegExp(`\\b(${cond})\\b`, 'gi');
    result = result.replace(reg, '<span class="sb-condition">$1</span>');
  }
  return result;
}

function highlightSenses(text: string): string {
  if (!text) return '';
  const senses = ['Blindsight', 'Darkvision', 'Tremorsense', 'Truesight'];

  let result = text;
  for (const sense of senses) {
    const reg = new RegExp(`\\b(${sense})\\b`, 'gi');
    result = result.replace(reg, '<span class="sb-sense">$1</span>');
  }
  return result;
}

function formatActionText(text: string): string {
  if (!text) return '';

  let formatted = text;
  formatted = formatted
    .replace(/^([^.:]+[\.:])/, '<em><strong>$1</strong></em>')
    .replace(/Melee Attack Roll:/gi, '<em>Melee Attack Roll:</em>')
    .replace(/Ranged Attack Roll:/gi, '<em>Ranged Attack Roll:</em>')
    .replace(/\bHit:/gi, '<em>Hit:</em>');

  return formatted;
}

function parse5eTagsInText(str: string): string {
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

function convertMarkdownTables(raw: string): string {
  const lines = raw.split('\n');
  let inTable = false;
  let tableHtml = '';
  const outLines: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableHtml = '<div class="entry-table-wrapper"><table class="entry-table">';
      }
      if (line.includes('---')) continue;
      const cells = line
        .split('|')
        .slice(1, -1)
        .map(c => c.trim());
      const tag = !tableHtml.includes('<thead>') ? 'th' : 'td';
      const row = cells.map(c => `<${tag}>${c}</${tag}>`).join('');
      if (tag === 'th') {
        tableHtml += `<thead><tr>${row}</tr></thead><tbody>`;
      } else {
        tableHtml += `<tr>${row}</tr>`;
      }
    } else {
      if (inTable) {
        inTable = false;
        tableHtml += '</tbody></table></div>';
        outLines.push(tableHtml);
      }
      outLines.push(line);
    }
  }
  if (inTable) {
    tableHtml += '</tbody></table></div>';
    outLines.push(tableHtml);
  }

  return outLines.join('\n');
}

function convertToParagraphs(text: string): string {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => {
      p = p.trim();
      if (!p) return '';
      if (
        p.startsWith('<div') ||
        p.startsWith('<table') ||
        p.startsWith('<ul') ||
        p.startsWith('<ol') ||
        p.startsWith('<blockquote') ||
        p.startsWith('<h')
      ) {
        return p;
      }
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    })
    .filter(Boolean);

  return paragraphs.join('');
}

@Pipe({
  name: 'formatDescription'
})
export class FormatDescriptionPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    const html = formatDescriptionHtml(value);
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
