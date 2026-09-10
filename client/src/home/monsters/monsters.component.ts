import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SystemDataService } from '../../app/services/system-data.service';

interface MonsterEntry {
  id: string;
  name: string;
  size?: string;
  type?: string;
  alignment?: string;
  challengeRating?: string | number;
  armorClass?: number;
  hitPoints?: number;
  speed?: string;
  sourceType?: 'system' | 'user';
  searchText: string;
  source?: string;
  ruleset?: string;
  data: {
    shortDescription?: string;
    description?: string;
    abilities?: {
      str?: number;
      dex?: number;
      con?: number;
      int?: number;
      wis?: number;
      cha?: number;
    };
    savingThrows?: string;
    skills?: string;
    damageResistances?: string;
    damageImmunities?: string;
    conditionImmunities?: string;
    senses?: string;
    languages?: string;
    traits?: MonsterFeature[];
    actions?: MonsterFeature[];
    legendaryActions?: MonsterFeature[];
  };
}

interface MonsterFeature {
  name: string;
  description: string;
}

type SortColumn =
  | 'name'
  | 'size'
  | 'type'
  | 'alignment'
  | 'challengeRating'
  | 'armorClass'
  | 'hitPoints';

@Component({
  selector: 'app-monsters',
  templateUrl: './monsters.component.html',
  styleUrls: ['./monsters.component.css']
})
export class MonstersComponent implements OnInit {
  isLoading = false;

  monsters: MonsterEntry[] = [];
  selectedMonster: MonsterEntry | null = null;

  searchText = '';
  selectedType = '';
  selectedSize = '';
  selectedAlignment = '';
  minCr = '';
  maxCr = '';
  minAc = '';
  maxAc = '';

  showAdvancedFilters = false;

  minHp = '';
  maxHp = '';
  speedFilter = '';
  languageFilter = '';

  hasLegendaryActions = false;
  hasDamageResistances = false;
  hasDamageImmunities = false;
  hasConditionImmunities = false;
  hasSpellcasting = false;
  selectedSources: string[] = ['MM'];
  selectedRulesets: string[] = ['2014'];

  sortColumn: SortColumn = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private route: ActivatedRoute,
    private systemData: SystemDataService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadMonsters();

    this.route.queryParamMap.subscribe(params => {
      this.openFromGlobalSearch(params.get('type'), params.get('id'));
    });
  }

  async loadMonsters(): Promise<void> {
    this.isLoading = true;

    try {
      await this.systemData.loadAllData();

      this.monsters = this.systemData.monsters.map(item => {
        const raw = item.raw || {};
        const data = item.data || {};

        return {
          id: item.id,
          name: item.name || raw.name || data.name || 'Unnamed Monster',
          size: raw.size || data.size || '',
          type: raw.type || data.type || '',
          alignment: raw.alignment || data.alignment || '',
          challengeRating: raw.challengeRating || raw.cr || data.challengeRating || '',
          armorClass: raw.armorClass || raw.ac || data.armorClass || undefined,
          hitPoints: raw.hitPoints || raw.hp || data.hitPoints || undefined,
          speed: raw.speed || data.speed || '',
          sourceType: item.sourceType || raw.sourceType || 'system',
          data,
          searchText: this.systemData.getSearchText(item),
          source: item.source,
          ruleset: item.ruleset
        };
      });
    } finally {
      this.isLoading = false;
    }
  }

  private openFromGlobalSearch(type: string | null, id: string | null): void {
    if (type !== 'monster' || !id) return;

    const monster = this.monsters.find(item => item.id === id);

    if (!monster) return;

    this.clearFilters();
    this.selectedMonster = monster;
  }

  selectMonster(monster: MonsterEntry): void {
    this.selectedMonster = monster;
  }

  closeDetailPanel(): void {
    this.selectedMonster = null;
  }

  sortBy(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.sortColumn = column;
    this.sortDirection = 'asc';
  }

  getSortIcon(column: SortColumn): string {
    if (this.sortColumn !== column) return '↕';

    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  clearFilters(): void {
    this.searchText = '';
    this.selectedType = '';
    this.selectedSize = '';
    this.selectedAlignment = '';
    this.minCr = '';
    this.maxCr = '';
    this.minAc = '';
    this.maxAc = '';

    this.minHp = '';
    this.maxHp = '';
    this.speedFilter = '';
    this.languageFilter = '';

    this.hasLegendaryActions = false;
    this.hasDamageResistances = false;
    this.hasDamageImmunities = false;
    this.hasConditionImmunities = false;
    this.hasSpellcasting = false;
    this.selectedSources = ['MM'];
    this.selectedRulesets = ['2014'];
  }

  get filteredMonsters(): MonsterEntry[] {
    const search = this.searchText.trim().toLowerCase();

    const result = this.monsters.filter(monster => {
      const monsterCr = this.toNumber(monster.challengeRating);
      const monsterAc = this.toNumber(monster.armorClass);
      const monsterHp = this.toNumber(monster.hitPoints);

      const minCr = this.minCr === '' ? null : Number(this.minCr);
      const maxCr = this.maxCr === '' ? null : Number(this.maxCr);
      const minAc = this.minAc === '' ? null : Number(this.minAc);
      const maxAc = this.maxAc === '' ? null : Number(this.maxAc);
      const minHp = this.minHp === '' ? null : Number(this.minHp);
      const maxHp = this.maxHp === '' ? null : Number(this.maxHp);

      const matchesSearch =
        !search ||
        monster.searchText.includes(search);

      const matchesType =
        !this.selectedType || monster.type === this.selectedType;

      const matchesSize =
        !this.selectedSize || monster.size === this.selectedSize;

      const matchesAlignment =
        !this.selectedAlignment || monster.alignment === this.selectedAlignment;

      const matchesCr =
        (minCr === null || monsterCr >= minCr) &&
        (maxCr === null || monsterCr <= maxCr);

      const matchesAc =
        (minAc === null || monsterAc >= minAc) &&
        (maxAc === null || monsterAc <= maxAc);

      const matchesHp =
        (minHp === null || monsterHp >= minHp) &&
        (maxHp === null || monsterHp <= maxHp);

      const matchesSpeed =
        !this.speedFilter ||
        monster.speed?.toLowerCase().includes(this.speedFilter.toLowerCase());

      const matchesLanguage =
        !this.languageFilter ||
        monster.data.languages?.toLowerCase().includes(this.languageFilter.toLowerCase());

      const matchesLegendary =
        !this.hasLegendaryActions ||
        !!monster.data.legendaryActions?.length;

      const matchesResistances =
        !this.hasDamageResistances ||
        !!monster.data.damageResistances;

      const matchesDamageImmunities =
        !this.hasDamageImmunities ||
        !!monster.data.damageImmunities;

      const matchesConditionImmunities =
        !this.hasConditionImmunities ||
        !!monster.data.conditionImmunities;

      const matchesSpellcasting =
        !this.hasSpellcasting ||
        !!monster.data.traits?.some(trait =>
          trait.name?.toLowerCase().includes('spellcasting') ||
          trait.description?.toLowerCase().includes('spellcasting')
        );

      const matchesSource =
        this.selectedSources.length === 0 || this.selectedSources.includes(monster.source || '');

      const matchesRuleset =
        this.selectedRulesets.length === 0 || this.selectedRulesets.includes(monster.ruleset || '');

      return (
        matchesSearch &&
        matchesType &&
        matchesSize &&
        matchesAlignment &&
        matchesCr &&
        matchesAc &&
        matchesHp &&
        matchesSpeed &&
        matchesLanguage &&
        matchesLegendary &&
        matchesResistances &&
        matchesDamageImmunities &&
        matchesConditionImmunities &&
        matchesSpellcasting &&
        matchesSource &&
        matchesRuleset
      );
    });

    return result.sort((a, b) => this.compareMonsters(a, b));
  }

  get monsterTypes(): string[] {
    return this.uniqueValues(this.monsters.map(monster => monster.type));
  }

  get monsterSizes(): string[] {
    return this.uniqueValues(this.monsters.map(monster => monster.size));
  }

  get monsterAlignments(): string[] {
    return this.uniqueValues(this.monsters.map(monster => monster.alignment));
  }

  get availableSources(): string[] {
    return this.uniqueValues(this.monsters.map(monster => monster.source));
  }

  get availableRulesets(): string[] {
    return this.uniqueValues(this.monsters.map(monster => monster.ruleset));
  }

  isFilterSelected(filter: 'source' | 'ruleset', value: string): boolean {
    const selected = filter === 'source' ? this.selectedSources : this.selectedRulesets;
    return selected.includes(value);
  }

  toggleFilter(filter: 'source' | 'ruleset', value: string): void {
    const selected = filter === 'source' ? this.selectedSources : this.selectedRulesets;
    const index = selected.indexOf(value);
    index >= 0 ? selected.splice(index, 1) : selected.push(value);
  }

  private compareMonsters(a: MonsterEntry, b: MonsterEntry): number {
    const direction = this.sortDirection === 'asc' ? 1 : -1;

    const aValue = this.getSortValue(a, this.sortColumn);
    const bValue = this.getSortValue(b, this.sortColumn);

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return (aValue - bValue) * direction;
    }

    return String(aValue).localeCompare(String(bValue)) * direction;
  }

  private getSortValue(monster: MonsterEntry, column: SortColumn): string | number {
    switch (column) {
      case 'challengeRating':
        return this.toNumber(monster.challengeRating);
      case 'armorClass':
        return this.toNumber(monster.armorClass);
      case 'hitPoints':
        return this.toNumber(monster.hitPoints);
      default:
        return monster[column] || '';
    }
  }

  private toNumber(value: unknown): number {
    if (value === undefined || value === null || value === '') return 0;

    if (value === '1/8') return 0.125;
    if (value === '1/4') return 0.25;
    if (value === '1/2') return 0.5;

    return Number(value) || 0;
  }

  private uniqueValues(values: Array<string | undefined>): string[] {
    return Array.from(
      new Set(values.filter((value): value is string => !!value))
    ).sort((a, b) => a.localeCompare(b));
  }
}