import { Component, OnInit } from '@angular/core';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../../player/firebase-config';
import { formatDescriptionHtml } from '../../services/format-description.pipe';

type ContentType = 'monster' | 'item' | 'spell';
type LibraryTab = 'mine' | 'community' | 'system';

interface SavedStatblock {
  id: string;
  name: string;
  data: string;
  ownerId: string;
  ownerEmail: string;
  visibility: 'private' | 'public';
  sourceType: 'system' | 'user';
  contentType: ContentType;
}

@Component({
  selector: 'app-statblock-widget',
  templateUrl: './statblock-widget.component.html',
  styleUrls: ['./statblock-widget.component.css']
})
export class StatblockWidgetComponent implements OnInit {
  currentUser: User | null = null;
  currentUserId = '';

  isLoading = false;
  searchText = '';

  selectedTab: LibraryTab = 'mine';
  selectedType: ContentType = 'monster';

  allItems: SavedStatblock[] = [];
  selectedItem: SavedStatblock | null = null;

  model: any = null;

  readonly abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  readonly crXpTable: Record<string, number> = {
    '0': 10, '1/8': 25, '1/4': 50, '1/2': 100, '1': 200, '2': 450,
    '3': 700, '4': 1100, '5': 1800, '6': 2300, '7': 2900, '8': 3900,
    '9': 5000, '10': 5900, '11': 7200, '12': 8400, '13': 10000,
    '14': 11500, '15': 13000, '16': 15000, '17': 18000, '18': 20000,
    '19': 22000, '20': 25000, '21': 33000, '22': 41000, '23': 50000,
    '24': 62000, '25': 75000, '26': 90000, '27': 105000, '28': 120000,
    '29': 135000, '30': 155000
  };

  async ngOnInit(): Promise<void> {
    onAuthStateChanged(auth, async user => {
      this.currentUser = user;
      this.currentUserId = user?.uid ?? '';

      if (!user) {
        this.selectedTab = 'system';
      }

      await this.loadStatblocks();
    });
  }

  async loadStatblocks(): Promise<void> {
    this.isLoading = true;

    try {
      const snap = await getDocs(
        query(collection(db, 'statblocks'), orderBy('createdAt'))
      );

      this.allItems = snap.docs.map(docSnap => {
        const data = docSnap.data() as any;

        return {
          id: docSnap.id,
          name: data.name || 'Névtelen statblock',
          data: data.data || '',
          ownerId: data.ownerId || '',
          ownerEmail: data.ownerEmail || '',
          visibility: data.visibility || 'private',
          sourceType: data.sourceType || 'user',
          contentType: data.contentType || 'monster'
        };
      });
    } finally {
      this.isLoading = false;
    }
  }

  get visibleItems(): SavedStatblock[] {
    const text = this.searchText.trim().toLowerCase();

    return this.allItems
      .filter(item => (item.contentType || 'monster') === this.selectedType)
      .filter(item => {
        if (this.selectedTab === 'system') {
          return item.sourceType === 'system';
        }

        if (this.selectedTab === 'mine') {
          return item.sourceType === 'user' && item.ownerId === this.currentUserId;
        }

        return item.sourceType === 'user'
          && item.visibility === 'public'
          && item.ownerId !== this.currentUserId;
      })
      .filter(item => !text || item.name.toLowerCase().includes(text))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  selectItem(item: SavedStatblock): void {
    try {
      this.selectedItem = item;
      this.selectedType = item.contentType || 'monster';
      this.model = JSON.parse(item.data);
      this.recalculateDerivedValues();
    } catch {
      this.selectedItem = null;
      this.model = null;
      alert('A mentett statblock hibás.');
    }
  }

  clearSelection(): void {
    this.selectedItem = null;
    this.model = null;
  }

  setTab(tab: LibraryTab): void {
    this.selectedTab = tab;
    this.clearSelection();
  }

  setType(type: ContentType): void {
    this.selectedType = type;
    this.clearSelection();
  }

  getAbilityMod(score: number): number {
    return Math.floor((Number(score || 10) - 10) / 2);
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
      const [a, b] = cr.split('/').map(Number);
      return b ? a / b : 0;
    }

    const num = Number(cr);
    return Number.isNaN(num) ? 0 : num;
  }

  getProficiencyBonus(): number {
    if (!this.model) return 2;

    if (this.model.proficiencyBonusOverride !== null && this.model.proficiencyBonusOverride !== undefined) {
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
    return this.crXpTable[this.model?.challengeRating] ?? 0;
  }

  recalculateDerivedValues(): void {
    if (!this.model || this.selectedType !== 'monster') return;

    const wis = this.model.abilities?.wis ?? 10;
    const perception = this.getSkillBonus('Perception');

    this.model.passivePerception = 10 + this.getAbilityMod(wis) + perception;
  }

  getSkillBonus(skill: string): number {
    if (!this.model?.skills || !this.model?.abilities) return 0;

    const map: Record<string, string> = {
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

    const ability = map[skill];
    const base = this.getAbilityMod(this.model.abilities[ability] ?? 10);
    const level = this.model.skills[skill];

    if (level === 'expert') return base + this.getProficiencyBonus() * 2;
    if (level === 'prof') return base + this.getProficiencyBonus();

    return base;
  }

  getArmorClass(): number {
    if (!this.model) return 10;

    let ac = 10;
    const dex = this.getAbilityMod(this.model.abilities?.dex ?? 10);

    switch (this.model.armorType) {
      case 'Natural Armor':
        ac = 10 + dex + Number(this.model.naturalArmorBonus || 0);
        break;
      case 'Mage Armor':
        ac = 13 + dex;
        break;
      case 'Padded':
      case 'Leather':
        ac = 11 + dex;
        break;
      case 'Studded Leather':
        ac = 12 + dex;
        break;
      case 'Hide':
        ac = 12 + Math.min(2, dex);
        break;
      case 'Chain Shirt':
        ac = 13 + Math.min(2, dex);
        break;
      case 'Scale Mail':
      case 'Breastplate':
        ac = 14 + Math.min(2, dex);
        break;
      case 'Half Plate':
        ac = 15 + Math.min(2, dex);
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
      default:
        ac = 10 + dex;
    }

    if (this.model.shield) {
      ac += 2;
    }

    return ac;
  }

  getArmorText(): string {
    const parts: string[] = [];

    if (this.model?.armorType && this.model.armorType !== 'None') {
      parts.push(this.model.armorType);
    }

    if (this.model?.shield) {
      parts.push('shield');
    }

    return parts.join(', ');
  }

  getSpeedText(): string {
    const speeds = this.model?.speeds || {};
    const parts: string[] = [];

    if (speeds.walk > 0) parts.push(`${speeds.walk} ft.`);
    if (speeds.burrow > 0) parts.push(`burrow ${speeds.burrow} ft.`);
    if (speeds.climb > 0) parts.push(`climb ${speeds.climb} ft.`);
    if (speeds.fly > 0) parts.push(`fly ${speeds.fly} ft.`);
    if (speeds.swim > 0) parts.push(`swim ${speeds.swim} ft.`);

    return parts.length ? parts.join(', ') : '0 ft.';
  }

  getTypeLine(): string {
    if (!this.model) return '';

    const typeText = this.model.type === 'Other' && this.model.otherType?.trim()
      ? this.model.otherType.trim()
      : this.model.type;

    const tagText = this.model.tag?.trim() ? ` (${this.model.tag.trim()})` : '';

    return `${this.model.size} ${typeText}${tagText}, ${this.model.alignment}`;
  }

  getSensesText(): string {
    const senses = this.model?.senses || {};
    const parts: string[] = [];

    if (senses.blindsight > 0) parts.push(`blindsight ${senses.blindsight} ft.`);
    if (senses.darkvision > 0) parts.push(`darkvision ${senses.darkvision} ft.`);
    if (senses.tremorsense > 0) parts.push(`tremorsense ${senses.tremorsense} ft.`);
    if (senses.truesight > 0) parts.push(`truesight ${senses.truesight} ft.`);

    parts.push(`passive Perception ${this.model?.passivePerception ?? 10}`);

    return parts.join(', ');
  }

  getLanguagesText(): string {
    let base = this.model?.languages?.join(', ') || '';

    if (this.model?.understandsBut) {
      base = base ? `${base}; understands but can't speak` : `understands but can't speak`;
    }

    if (this.model?.speaksBut) {
      base = base ? `${base}; speaks only through magic` : `speaks only through magic`;
    }

    if (this.model?.telepathy > 0) {
      base = base ? `${base}, telepathy ${this.model.telepathy} ft.` : `telepathy ${this.model.telepathy} ft.`;
    }

    return base || '—';
  }

  getSavingThrowsText(): string {
    if (!this.model?.savingThrows) return '';

    return this.abilityKeys
      .filter(key => this.model.savingThrows[key])
      .map(key => {
        const value = this.getAbilityMod(this.model.abilities[key]) + this.getProficiencyBonus();
        return `${key.toUpperCase()} ${this.formatSigned(value)}`;
      })
      .join(', ');
  }

  hasAnySavingThrow(): boolean {
    return this.abilityKeys.some(key => this.model?.savingThrows?.[key]);
  }

  getSkillsText(): string {
    if (!this.model?.skills) return '';

    return Object.keys(this.model.skills)
      .filter(skill => this.model.skills[skill] !== 'none')
      .map(skill => `${skill} ${this.formatSigned(this.getSkillBonus(skill))}`)
      .join(', ');
  }

  hasAnySkill(): boolean {
    return !!this.getSkillsText();
  }

  getDamageGroupText(level: string): string {
    if (!this.model?.damageTypes) return '';

    return Object.keys(this.model.damageTypes)
      .filter(key => this.model.damageTypes[key] === level)
      .join(', ');
  }

  hasDamageGroup(level: string): boolean {
    return !!this.getDamageGroupText(level);
  }

  getConditionImmunityText(): string {
    return this.model?.conditionImmunities?.join(', ') || '';
  }

  getSpellComponentsText(): string {
    const components = this.model?.components;

    if (!components) return '-';

    const parts: string[] = [];

    if (components.verbal) parts.push('V');
    if (components.somatic) parts.push('S');

    if (components.material) {
      parts.push(
        components.materialText
          ? `M (${components.materialText})`
          : 'M'
      );
    }

    return parts.length ? parts.join(', ') : '-';
  }

  renderText(text: string): string {
    return formatDescriptionHtml(text);
  }
}