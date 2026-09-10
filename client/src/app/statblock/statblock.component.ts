import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemSpellEditorComponent } from './editors/item-spell-editor/item-spell-editor.component';
import { MonsterEditorComponent } from './editors/monster-editor/monster-editor.component';
import { auth, db } from '../player/firebase-config';
import { formatDescriptionHtml } from '../services/format-description.pipe';

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';

import { onAuthStateChanged, User } from 'firebase/auth';

type SkillLevel = 'none' | 'prof' | 'expert';
type DamageLevel = 'none' | 'vulnerable' | 'resistant' | 'immune';
type VisibilityMode = 'private' | 'public';
type SourceType = 'system' | 'user';
type LibraryTab = 'system' | 'mine' | 'community';
type ContentType = 'monster' | 'character' | 'item' | 'spell';

interface NamedEntry {
  name: string;
  text: string;
}

interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

interface Speeds {
  walk: number;
  burrow: number;
  climb: number;
  fly: number;
  swim: number;
}

interface Senses {
  blindsight: number;
  darkvision: number;
  tremorsense: number;
  truesight: number;
}

interface SpecialSections {
  legendaryCreature: boolean;
  legendaryDescription: string;
  mythic: boolean;
  mythicDescription: string;
  lair: boolean;
  lairDescription: string;
  lairEndNote: string;
  regional: boolean;
  regionalDescription: string;
  regionalEndNote: string;
}

interface MonsterFormModel {
  name: string;
  size: string;
  type: string;
  otherType: string;
  tag: string;
  alignment: string;
  armorType: string;
  naturalArmorBonus: number;
  shield: boolean;
  hitDice: string;
  hitPoints: number;
  speeds: Speeds;
  abilities: AbilityScores;
  savingThrows: Record<keyof AbilityScores, boolean>;
  skills: Record<string, SkillLevel>;
  damageTypes: Record<string, DamageLevel>;
  conditionImmunities: string[];
  languages: string[];
  telepathy: number;
  speaksBut: boolean;
  understandsBut: boolean;
  senses: Senses;
  passivePerception: number;
  challengeRating: string;
  customCrText: string;
  proficiencyBonusOverride: number | null;
  sections: SpecialSections;
  traits: NamedEntry[];
  actions: NamedEntry[];
  bonusActions: NamedEntry[];
  reactions: NamedEntry[];
  legendaryActions: NamedEntry[];
  mythicActions: NamedEntry[];
  lairActions: NamedEntry[];
  regionalEffects: NamedEntry[];
}

interface SavedStatblock {
  id: string;
  name: string;
  data: string;
  ownerId: string;
  ownerEmail: string;
  visibility: VisibilityMode;
  sourceType: SourceType;
  contentType: ContentType;
  createdAt?: any;
  updatedAt?: any;
}

@Component({
  selector: 'app-statblock',
  standalone: true,
  imports: [CommonModule, FormsModule, MonsterEditorComponent, ItemSpellEditorComponent],
  templateUrl: './statblock.component.html',
  styleUrls: ['./statblock.component.css']
})
export class StatblockComponent implements OnInit {
  readonly sizes = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];

  readonly types = [
    'Aberration', 'Beast', 'Celestial', 'Construct', 'Dragon', 'Elemental',
    'Fey', 'Fiend', 'Giant', 'Humanoid', 'Monstrosity', 'Ooze',
    'Plant', 'Undead', 'Other'
  ];

  readonly armorTypes = [
    'None', 'Natural Armor', 'Mage Armor', 'Padded', 'Leather',
    'Studded Leather', 'Hide', 'Chain Shirt', 'Scale Mail',
    'Breastplate', 'Half Plate', 'Ring Mail', 'Chain Mail',
    'Splint', 'Plate', 'Other'
  ];

  readonly abilityKeys: (keyof AbilityScores)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  readonly skillAbilityMap: Record<string, keyof AbilityScores> = {
    'Acrobatics': 'dex',
    'Animal Handling': 'wis',
    'Arcana': 'int',
    'Athletics': 'str',
    'Deception': 'cha',
    'History': 'int',
    'Insight': 'wis',
    'Intimidation': 'cha',
    'Investigation': 'int',
    'Medicine': 'wis',
    'Nature': 'int',
    'Perception': 'wis',
    'Performance': 'cha',
    'Persuasion': 'cha',
    'Religion': 'int',
    'Sleight of Hand': 'dex',
    'Stealth': 'dex',
    'Survival': 'wis'
  };

  readonly skillNames = Object.keys(this.skillAbilityMap);

  readonly conditions = [
    'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened',
    'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified',
    'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'
  ];

  readonly damageTypeNames = [
    'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning',
    'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing',
    'Thunder', 'Nonmagical Attacks', 'Non-Silvered Attacks', 'Non-Adamantine Attacks'
  ];

  readonly languagesList = [
    'All', 'Abyssal', 'Aquan', 'Auran', 'Celestial', 'Common',
    'Deep Speech', 'Draconic', 'Dwarvish', 'Elvish', 'Giant',
    'Gnomish', 'Goblin', 'Halfling', 'Ignan', 'Infernal', 'Orc',
    'Primordial', 'Sylvan', 'Terran', 'Undercommon'
  ];

  readonly crXpTable: Record<string, number> = {
    '0': 10, '1/8': 25, '1/4': 50, '1/2': 100, '1': 200, '2': 450,
    '3': 700, '4': 1100, '5': 1800, '6': 2300, '7': 2900, '8': 3900,
    '9': 5000, '10': 5900, '11': 7200, '12': 8400, '13': 10000,
    '14': 11500, '15': 13000, '16': 15000, '17': 18000, '18': 20000,
    '19': 22000, '20': 25000, '21': 33000, '22': 41000, '23': 50000,
    '24': 62000, '25': 75000, '26': 90000, '27': 105000, '28': 120000,
    '29': 135000, '30': 155000
  };

  model: MonsterFormModel = this.createDefaultModel();
  itemModel: any = this.createDefaultItemModel();
  spellModel: any = this.createDefaultSpellModel();

  currentUser: User | null = null;
  currentUserId = '';
  currentUserEmail = '';

  selectedSaveId: string | null = null;
  saveVisibility: VisibilityMode = 'private';
  selectedLibraryTab: LibraryTab = 'mine';
  selectedContentType: ContentType = 'monster';

  systemStatblocks: SavedStatblock[] = [];
  myStatblocks: SavedStatblock[] = [];
  communityStatblocks: SavedStatblock[] = [];

  isLoadingSaves = false;
  selectedLanguageToAdd = '';

  async ngOnInit(): Promise<void> {
    this.recalculateDerivedValues();

    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      this.currentUserId = user?.uid ?? '';
      this.currentUserEmail = user?.email ?? '';

      if (!user) {
        this.selectedLibraryTab = 'system';
        this.selectedSaveId = null;
      }

      await this.loadSavedStatblocks();
    });
  }

  createDefaultItemModel(): any {
    return {
      name: '',
      category: 'Adventuring Gear',
      rarity: 'Common',
      requiresAttunement: false,
      cost: '',
      weight: '',
      damage: '',
      damageType: '',
      range: '',
      armorClass: '',
      propertiesText: '',
      strengthRequirement: '',
      stealthDisadvantage: false,
      description: ''
    };
  }

  createDefaultSpellModel(): any {
    return {
      name: '',
      level: 0,
      school: 'Evocation',
      castingTime: '1 action',
      range: 'Self',
      duration: 'Instantaneous',
      concentration: false,
      ritual: false,
      components: {
        verbal: false,
        somatic: false,
        material: false,
        materialText: ''
      },
      classesText: '',
      description: '',
      higherLevels: ''
    };
  }

  getActiveModel(): any {
    if (this.selectedContentType === 'monster') return this.model;
    if (this.selectedContentType === 'item') return this.itemModel;
    if (this.selectedContentType === 'spell') return this.spellModel;
    return this.model;
  }

  createDefaultModel(): MonsterFormModel {
    const skills: Record<string, SkillLevel> = {};
    for (const skill of this.skillNames) {
      skills[skill] = 'none';
    }

    const damageTypes: Record<string, DamageLevel> = {};
    for (const type of this.damageTypeNames) {
      damageTypes[type] = 'none';
    }

    return {
      name: 'Shadow Drake',
      size: 'Medium',
      type: 'Dragon',
      otherType: '',
      tag: '',
      alignment: 'chaotic evil',
      armorType: 'Natural Armor',
      naturalArmorBonus: 3,
      shield: false,
      hitDice: '10d8 + 20',
      hitPoints: 65,
      speeds: {
        walk: 30,
        burrow: 0,
        climb: 20,
        fly: 60,
        swim: 0
      },
      abilities: {
        str: 16,
        dex: 14,
        con: 14,
        int: 8,
        wis: 12,
        cha: 11
      },
      savingThrows: {
        str: false,
        dex: true,
        con: true,
        int: false,
        wis: false,
        cha: false
      },
      skills,
      damageTypes,
      conditionImmunities: [],
      languages: ['Common', 'Draconic'],
      telepathy: 0,
      speaksBut: false,
      understandsBut: false,
      senses: {
        blindsight: 10,
        darkvision: 60,
        tremorsense: 0,
        truesight: 0
      },
      passivePerception: 10,
      challengeRating: '3',
      customCrText: '',
      proficiencyBonusOverride: null,
      sections: {
        legendaryCreature: false,
        legendaryDescription: '',
        mythic: false,
        mythicDescription: '',
        lair: false,
        lairDescription: '',
        lairEndNote: '',
        regional: false,
        regionalDescription: '',
        regionalEndNote: ''
      },
      traits: [
        {
          name: 'Shadow Stealth',
          text: 'While in dim light or darkness, this creature can take the Hide action as a bonus action.'
        }
      ],
      actions: [
        {
          name: 'Bite',
          text: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (1d10 + 5) piercing damage plus 4 (1d8) necrotic damage.'
        }
      ],
      bonusActions: [],
      reactions: [],
      legendaryActions: [],
      mythicActions: [],
      lairActions: [],
      regionalEffects: []
    };
  }

  canSave(): boolean {
    return !!this.currentUserId;
  }

  getSelectedSavedItem(): SavedStatblock | null {
    const all = [...this.systemStatblocks, ...this.myStatblocks, ...this.communityStatblocks];
    return all.find(x => x.id === this.selectedSaveId) || null;
  }

  async loadSavedStatblocks(): Promise<void> {
    this.isLoadingSaves = true;

    try {
      const snap = await getDocs(
        query(collection(db, 'statblocks'), orderBy('createdAt'))
      );

      const all: SavedStatblock[] = snap.docs.map(d => {
        const data = d.data() as any;

        return {
          id: d.id,
          name: data.name || 'Névtelen statblock',
          data: data.data || '',
          ownerId: data.ownerId || '',
          ownerEmail: data.ownerEmail || '',
          visibility: (data.visibility || 'private') as VisibilityMode,
          sourceType: (data.sourceType || 'user') as SourceType,
          contentType: (data.contentType || 'monster') as ContentType,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        };
      });

      this.systemStatblocks = all.filter(x => x.sourceType === 'system');

      this.myStatblocks = all.filter(
        x => x.sourceType === 'user' && !!this.currentUserId && x.ownerId === this.currentUserId
      );

      this.communityStatblocks = all.filter(
        x =>
          x.sourceType === 'user' &&
          x.visibility === 'public' &&
          !!this.currentUserId &&
          x.ownerId !== this.currentUserId
      );

      if (!this.currentUserId) {
        this.communityStatblocks = all.filter(
          x => x.sourceType === 'user' && x.visibility === 'public'
        );
      }
    } catch (error) {
      console.error(error);
      alert('Nem sikerült betölteni a mentéseket.');
    } finally {
      this.isLoadingSaves = false;
    }
  }

  async save(): Promise<void> {
    if (!this.currentUserId) {
      alert('Mentéshez be kell jelentkezned.');
      return;
    }

    const current = this.getSelectedSavedItem();

    if (current && current.sourceType === 'system') {
      this.selectedSaveId = null;
    }

    if (current && current.sourceType === 'user' && current.ownerId !== this.currentUserId) {
      this.selectedSaveId = null;
    }

    const activeModel = this.getActiveModel();
    const payload = JSON.stringify(activeModel);
    const fallbackName =
      this.selectedContentType === 'monster'
        ? 'Névtelen statblock'
        : this.selectedContentType === 'item'
          ? 'Névtelen item'
          : this.selectedContentType === 'spell'
            ? 'Névtelen spell'
            : 'Névtelen';

    try {
      if (this.selectedSaveId) {
        await updateDoc(doc(db, 'statblocks', this.selectedSaveId), {
          name: activeModel.name || fallbackName,
          data: payload,
          ownerId: this.currentUserId,
          ownerEmail: this.currentUserEmail,
          visibility: this.saveVisibility,
          sourceType: 'user',
          contentType: this.selectedContentType,
          updatedAt: serverTimestamp()
        });
      } else {
        const newRef = await addDoc(collection(db, 'statblocks'), {
          name: activeModel.name || fallbackName,
          data: payload,
          ownerId: this.currentUserId,
          ownerEmail: this.currentUserEmail,
          visibility: this.saveVisibility,
          sourceType: 'user',
          contentType: this.selectedContentType,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        this.selectedSaveId = newRef.id;
      }

      await this.loadSavedStatblocks();
      this.selectedLibraryTab = 'mine';
      alert('Mentés kész.');
    } catch (error) {
      console.error(error);
      alert('Mentési hiba történt.');
    }
  }

  loadStatblock(item: SavedStatblock): void {
    try {
      const parsed = JSON.parse(item.data);

      this.selectedContentType = item.contentType || 'monster';

      if (this.selectedContentType === 'monster') {
        this.model = parsed;
        this.recalculateDerivedValues();
      }

      if (this.selectedContentType === 'item') {
        this.itemModel = parsed;
      }

      if (this.selectedContentType === 'spell') {
        this.spellModel = parsed;
      }

      this.selectedSaveId = item.id;

      if (item.sourceType === 'user' && item.ownerId === this.currentUserId) {
        this.saveVisibility = item.visibility;
      } else {
        this.saveVisibility = 'private';
      }
    } catch (error) {
      console.error(error);
      alert('A mentett adat hibás.');
    }
  }

  async deleteStatblock(item: SavedStatblock): Promise<void> {
    if (item.sourceType === 'system') {
      alert('Az alap adatbázis elemei nem törölhetők innen.');
      return;
    }

    if (item.ownerId !== this.currentUserId) {
      alert('Csak a saját statblockjaidat törölheted.');
      return;
    }

    try {
      await deleteDoc(doc(db, 'statblocks', item.id));

      if (this.selectedSaveId === item.id) {
        this.selectedSaveId = null;
      }

      await this.loadSavedStatblocks();
    } catch (error) {
      console.error(error);
      alert('Törlési hiba történt.');
    }
  }

  reset(): void {
    if (this.selectedContentType === 'monster') {
      this.model = this.createDefaultModel();
      this.recalculateDerivedValues();
    }

    if (this.selectedContentType === 'item') {
      this.itemModel = this.createDefaultItemModel();
    }

    if (this.selectedContentType === 'spell') {
      this.spellModel = this.createDefaultSpellModel();
    }

    this.selectedSaveId = null;
    this.saveVisibility = 'private';
    this.selectedLanguageToAdd = '';
  }

  startFromLoadedAsCopy(): void {
    this.selectedSaveId = null;
    if (!this.currentUserId) {
      this.saveVisibility = 'private';
    }
  }

  addEntry(list: NamedEntry[]): void {
    list.push({ name: '', text: '' });
  }

  removeEntry(list: NamedEntry[], index: number): void {
    list.splice(index, 1);
  }

  moveUp(list: NamedEntry[], index: number): void {
    if (index <= 0) return;
    const temp = list[index - 1];
    list[index - 1] = list[index];
    list[index] = temp;
  }

  moveDown(list: NamedEntry[], index: number): void {
    if (index >= list.length - 1) return;
    const temp = list[index + 1];
    list[index + 1] = list[index];
    list[index] = temp;
  }

  onAbilityChange(): void {
    this.recalculateDerivedValues();
  }

  onCrChange(): void {
    this.recalculateDerivedValues();
  }

  recalculateDerivedValues(): void {
    this.model.passivePerception =
      10 + this.getAbilityMod(this.model.abilities.wis) + this.getSkillBonus('Perception');
  }

  getAbilityMod(score: number): number {
    return Math.floor((score - 10) / 2);
  }

  formatModifier(score: number): string {
    const mod = this.getAbilityMod(score);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }

  formatSigned(value: number): string {
    return value >= 0 ? `+${value}` : `${value}`;
  }

  parseCr(cr: string): number {
    if (!cr) return 0;

    if (cr.includes('/')) {
      const parts = cr.split('/');
      if (parts.length === 2) {
        const a = Number(parts[0]);
        const b = Number(parts[1]);
        if (!Number.isNaN(a) && !Number.isNaN(b) && b !== 0) {
          return a / b;
        }
      }
    }

    const num = Number(cr);
    return Number.isNaN(num) ? 0 : num;
  }

  getProficiencyBonus(): number {
    if (this.model.proficiencyBonusOverride !== null) {
      return this.model.proficiencyBonusOverride;
    }

    const cr = this.parseCr(this.model.challengeRating);
    if (cr <= 4) return 2;
    if (cr <= 8) return 3;
    if (cr <= 12) return 4;
    if (cr <= 16) return 5;
    if (cr <= 20) return 6;
    if (cr <= 24) return 7;
    if (cr <= 28) return 8;
    return 9;
  }

  getXp(): number {
    return this.crXpTable[this.model.challengeRating] ?? 0;
  }

  getSpellComponentsText(): string {
    if (!this.spellModel?.components) return '-';

    const parts: string[] = [];

    if (this.spellModel.components.verbal) parts.push('V');
    if (this.spellModel.components.somatic) parts.push('S');

    if (this.spellModel.components.material) {
      parts.push(
        this.spellModel.components.materialText
          ? `M (${this.spellModel.components.materialText})`
          : 'M'
      );
    }

    return parts.length ? parts.join(', ') : '-';
  }

  getArmorClass(): number {
    let ac = 10;

    switch (this.model.armorType) {
      case 'None':
        ac = 10;
        break;
      case 'Natural Armor':
        ac = 10 + this.getAbilityMod(this.model.abilities.dex) + this.model.naturalArmorBonus;
        break;
      case 'Mage Armor':
        ac = 13 + this.getAbilityMod(this.model.abilities.dex);
        break;
      case 'Padded':
      case 'Leather':
        ac = 11 + this.getAbilityMod(this.model.abilities.dex);
        break;
      case 'Studded Leather':
        ac = 12 + this.getAbilityMod(this.model.abilities.dex);
        break;
      case 'Hide':
        ac = 12 + Math.min(2, this.getAbilityMod(this.model.abilities.dex));
        break;
      case 'Chain Shirt':
        ac = 13 + Math.min(2, this.getAbilityMod(this.model.abilities.dex));
        break;
      case 'Scale Mail':
      case 'Breastplate':
        ac = 14 + Math.min(2, this.getAbilityMod(this.model.abilities.dex));
        break;
      case 'Half Plate':
        ac = 15 + Math.min(2, this.getAbilityMod(this.model.abilities.dex));
        break;
      case 'Ring Mail':
        ac = 14;
        break;
      case 'Chain Mail':
        ac = 16;
        break;
      case 'Splint':
        ac = 17;
        break;
      case 'Plate':
        ac = 18;
        break;
      case 'Other':
      default:
        ac = 10 + this.getAbilityMod(this.model.abilities.dex);
        break;
    }

    if (this.model.shield) {
      ac += 2;
    }

    return ac;
  }

  getArmorText(): string {
    const parts: string[] = [];

    if (this.model.armorType && this.model.armorType !== 'None') {
      parts.push(this.model.armorType);
    }

    if (this.model.shield) {
      parts.push('shield');
    }

    return parts.join(', ');
  }

  getSpeedText(): string {
    const parts: string[] = [];

    if (this.model.speeds.walk > 0) parts.push(`${this.model.speeds.walk} ft.`);
    if (this.model.speeds.burrow > 0) parts.push(`burrow ${this.model.speeds.burrow} ft.`);
    if (this.model.speeds.climb > 0) parts.push(`climb ${this.model.speeds.climb} ft.`);
    if (this.model.speeds.fly > 0) parts.push(`fly ${this.model.speeds.fly} ft.`);
    if (this.model.speeds.swim > 0) parts.push(`swim ${this.model.speeds.swim} ft.`);

    return parts.length ? parts.join(', ') : '0 ft.';
  }

  getSavingThrowValue(key: keyof AbilityScores): number {
    const mod = this.getAbilityMod(this.model.abilities[key]);
    return mod + (this.model.savingThrows[key] ? this.getProficiencyBonus() : 0);
  }

  hasAnySavingThrow(): boolean {
    return this.abilityKeys.some(key => this.model.savingThrows[key]);
  }

  getSavingThrowsText(): string {
    const values: string[] = [];
    for (const key of this.abilityKeys) {
      if (this.model.savingThrows[key]) {
        values.push(`${key.toUpperCase()} ${this.formatSigned(this.getSavingThrowValue(key))}`);
      }
    }
    return values.join(', ');
  }

  getSkillBonus(skill: string): number {
    const ability = this.skillAbilityMap[skill];
    const base = this.getAbilityMod(this.model.abilities[ability]);
    const level = this.model.skills[skill];

    if (level === 'expert') return base + (this.getProficiencyBonus() * 2);
    if (level === 'prof') return base + this.getProficiencyBonus();
    return base;
  }

  hasAnySkill(): boolean {
    return this.skillNames.some(skill => this.model.skills[skill] !== 'none');
  }

  getSkillsText(): string {
    const values: string[] = [];

    for (const skill of this.skillNames) {
      if (this.model.skills[skill] !== 'none') {
        values.push(`${skill} ${this.formatSigned(this.getSkillBonus(skill))}`);
      }
    }

    return values.join(', ');
  }

  setSkillLevel(skill: string, level: SkillLevel): void {
    this.model.skills[skill] = level;
    this.recalculateDerivedValues();
  }

  getDamageLevel(type: string): DamageLevel {
    return this.model.damageTypes[type] || 'none';
  }

  isDamageLevel(type: string, level: DamageLevel): boolean {
    return this.getDamageLevel(type) === level;
  }

  toggleDamageLevel(type: string, level: DamageLevel, checked: boolean): void {
    if (checked) {
      this.model.damageTypes[type] = level;
    } else if (this.model.damageTypes[type] === level) {
      this.model.damageTypes[type] = 'none';
    }
  }

  getDamageGroupText(level: 'vulnerable' | 'resistant' | 'immune'): string {
    return this.damageTypeNames
      .filter(type => this.model.damageTypes[type] === level)
      .join(', ');
  }

  hasDamageGroup(level: 'vulnerable' | 'resistant' | 'immune'): boolean {
    return this.damageTypeNames.some(type => this.model.damageTypes[type] === level);
  }

  getConditionImmunityText(): string {
    return this.model.conditionImmunities.join(', ');
  }

  hasCondition(item: string): boolean {
    return this.model.conditionImmunities.includes(item);
  }

  toggleCondition(item: string, checked: boolean): void {
    if (checked) {
      if (!this.model.conditionImmunities.includes(item)) {
        this.model.conditionImmunities.push(item);
      }
    } else {
      this.model.conditionImmunities = this.model.conditionImmunities.filter(value => value !== item);
    }
  }

  getAvailableLanguages(): string[] {
    return this.languagesList.filter(lang => !this.model.languages.includes(lang));
  }

  addLanguageFromSelect(): void {
    if (!this.selectedLanguageToAdd) return;
    if (!this.model.languages.includes(this.selectedLanguageToAdd)) {
      this.model.languages.push(this.selectedLanguageToAdd);
    }
    this.selectedLanguageToAdd = '';
  }

  isLanguageSelected(lang: string): boolean {
    return this.model.languages.includes(lang);
  }

  toggleSelectedLanguage(lang: string, checked: boolean): void {
    if (checked) {
      if (!this.model.languages.includes(lang)) {
        this.model.languages.push(lang);
      }
    } else {
      this.model.languages = this.model.languages.filter(value => value !== lang);
      if (this.selectedLanguageToAdd === lang) {
        this.selectedLanguageToAdd = '';
      }
    }
  }

  getLanguagesText(): string {
    let base = this.model.languages.join(', ');

    if (this.model.understandsBut) {
      base = base ? `${base}; understands but can't speak` : `understands but can't speak`;
    }

    if (this.model.speaksBut) {
      base = base ? `${base}; speaks only through magic` : `speaks only through magic`;
    }

    if (this.model.telepathy > 0) {
      base = base ? `${base}, telepathy ${this.model.telepathy} ft.` : `telepathy ${this.model.telepathy} ft.`;
    }

    return base || '—';
  }

  getSensesText(): string {
    const parts: string[] = [];

    if (this.model.senses.blindsight > 0) parts.push(`blindsight ${this.model.senses.blindsight} ft.`);
    if (this.model.senses.darkvision > 0) parts.push(`darkvision ${this.model.senses.darkvision} ft.`);
    if (this.model.senses.tremorsense > 0) parts.push(`tremorsense ${this.model.senses.tremorsense} ft.`);
    if (this.model.senses.truesight > 0) parts.push(`truesight ${this.model.senses.truesight} ft.`);
    parts.push(`passive Perception ${this.model.passivePerception}`);

    return parts.join(', ');
  }

  getTypeLine(): string {
    const typeText = this.model.type === 'Other' && this.model.otherType.trim()
      ? this.model.otherType.trim()
      : this.model.type;

    const tagText = this.model.tag.trim() ? ` (${this.model.tag.trim()})` : '';
    return `${this.model.size} ${typeText}${tagText}, ${this.model.alignment}`;
  }

  getDisplayName(): string {
    return this.model.name.trim() || 'Unnamed Monster';
  }

  renderText(text: string): string {
    return formatDescriptionHtml(text);
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackBySaveId(_: number, item: SavedStatblock): string {
    return item.id;
  }

  getLibraryTitle(tab: LibraryTab): string {
    if (tab === 'system') return 'Alap adatbázis';
    if (tab === 'mine') return 'Saját statblockjaim';
    return 'Közösségi statblockok';
  }

  getLibraryItems(tab: LibraryTab): SavedStatblock[] {
    let items: SavedStatblock[];

    if (tab === 'system') {
      items = this.systemStatblocks;
    } else if (tab === 'mine') {
      items = this.myStatblocks;
    } else {
      items = this.communityStatblocks;
    }

    return items.filter(item => (item.contentType || 'monster') === this.selectedContentType);
  }

  isSelectedSavedItem(item: SavedStatblock): boolean {
    return this.selectedSaveId === item.id;
  }

  getSaveModeLabel(item: SavedStatblock): string {
    if (item.sourceType === 'system') return 'alap';
    return item.visibility === 'public' ? 'publikus' : 'privát';
  }
selectContentType(type: ContentType): void {
  this.selectedContentType = type;
  this.selectedSaveId = null;
  this.saveVisibility = 'private';
}
  getOwnerLabel(item: SavedStatblock): string {
    if (item.sourceType === 'system') return 'Rendszer';
    if (item.ownerId === this.currentUserId) return 'Saját';
    return item.ownerEmail || 'Másik felhasználó';
  }
}