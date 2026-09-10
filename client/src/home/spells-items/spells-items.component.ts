import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SystemDataService } from '../../app/services/system-data.service';

type ViewMode = 'spells' | 'items';
type SortColumn = 'name' | 'school' | 'castingTime' | 'range' | 'duration' | 'components';

interface ContentItem {
  id: string;
  name: string;
  contentType: 'spell' | 'item';
  sourceType: 'system' | 'user';
  data: any;
  searchText: string;
  source?: string;
  ruleset?: string;
}

@Component({
  selector: 'app-spells-items',
  templateUrl: './spells-items.component.html',
  styleUrls: ['./spells-items.component.css']
})
export class SpellsItemsComponent implements OnInit {
  viewMode: ViewMode = 'spells';

  searchText = '';
  isLoading = false;

  allContent: ContentItem[] = [];
  selectedItem: ContentItem | null = null;
  detailNeedsExpansion = false;

  selectedClass = 'all';
  selectedSpellLevel: number | null = null;

  selectedItemCategory = 'all';
  selectedRarity = 'all';
  showAdvancedSearch = false;
  selectedSources: string[] = ['PHB'];
  selectedRulesets: string[] = ['2014'];
  sortColumn: SortColumn = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';

  spellClasses = [
    'all',
    'Artificer',
    'Bard',
    'Cleric',
    'Druid',
    'Paladin',
    'Ranger',
    'Sorcerer',
    'Warlock',
    'Wizard'
  ];

  spellLevels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  itemCategories = [
    'all',
    'Weapon',
    'Armor',
    'Adventuring Gear',
    'Tools',
    'Magic Item',
    'Wondrous Item'
  ];

  rarities = [
    'all',
    'Common',
    'Uncommon',
    'Rare',
    'Very Rare',
    'Legendary',
    'Artifact'
  ];

  constructor(
    private route: ActivatedRoute,
    private systemData: SystemDataService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadContent();

    this.route.queryParamMap.subscribe(params => {
      this.openFromGlobalSearch(params.get('type'), params.get('id'));
    });
  }

  async loadContent(): Promise<void> {
    this.isLoading = true;

    try {
      await this.systemData.loadAllData();

      const spells: ContentItem[] = this.systemData.spells.map(item => ({
        id: item.id,
        name: item.name,
        contentType: 'spell',
        sourceType: item.sourceType,
        data: item.data || {},
        searchText: this.systemData.getSearchText(item),
        source: item.source,
        ruleset: item.ruleset
      }));

      const items: ContentItem[] = this.systemData.items.map(item => ({
        id: item.id,
        name: item.name,
        contentType: 'item',
        sourceType: item.sourceType,
        data: item.data || {},
        searchText: this.systemData.getSearchText(item),
        source: item.source,
        ruleset: item.ruleset
      }));

      this.allContent = [...spells, ...items];
    } finally {
      this.isLoading = false;
    }
  }

  private openFromGlobalSearch(type: string | null, id: string | null): void {
    if (!type || !id) return;

    if (type !== 'spell' && type !== 'item') return;

    const item = this.allContent.find(
      entry => entry.id === id && entry.contentType === type
    );

    if (!item) return;

    this.searchText = '';
    this.selectedItem = item;
    this.detailNeedsExpansion = this.needsExpandedDetail(item);

    if (item.contentType === 'spell') {
      this.viewMode = 'spells';
      this.selectedClass = 'all';
      this.selectedSpellLevel = Number(item.data.level) || 0;
    }

    if (item.contentType === 'item') {
      this.viewMode = 'items';
      this.selectedItemCategory = 'all';
      this.selectedRarity = 'all';
    }
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    this.clearDetailSelection();
    this.searchText = '';
    this.selectedSpellLevel = null;
    this.showAdvancedSearch = false;
  }

  selectClass(className: string): void {
    this.selectedClass = className;
    this.selectedSpellLevel = null;
    this.clearDetailSelection();
  }

  selectSpellLevel(level: number | null): void {
    this.selectedSpellLevel = level;
    this.clearDetailSelection();
  }

  selectItem(item: ContentItem): void {
    this.selectedItem = item;
    this.detailNeedsExpansion = this.needsExpandedDetail(item);
  }

  isLongSpellName(spell: ContentItem): boolean {
    return spell.name.length > 15;
  }

  clearDetailSelection(): void {
    this.selectedItem = null;
    this.detailNeedsExpansion = false;
  }

  private needsExpandedDetail(item: ContentItem): boolean {
    const descriptionLength = String(item.data.description || '').length;
    const higherLevelsLength = String(item.data.higherLevels || '').length;
    return descriptionLength + higherLevelsLength > 700;
  }

  get availableSources(): string[] {
    return Array.from(new Set(
      this.currentContent
        .map(item => item.source)
        .filter((source): source is string => !!source)
    )).sort();
  }

  get availableRulesets(): string[] {
    return Array.from(new Set(
      this.currentContent
        .map(item => item.ruleset)
        .filter((ruleset): ruleset is string => !!ruleset)
    )).sort();
  }

  get currentContent(): ContentItem[] {
    return this.viewMode === 'spells' ? this.spells : this.items;
  }

  isFilterSelected(filter: 'source' | 'ruleset', value: string): boolean {
    const selected = filter === 'source' ? this.selectedSources : this.selectedRulesets;
    return selected.includes(value);
  }

  toggleFilter(filter: 'source' | 'ruleset', value: string): void {
    const selected = filter === 'source' ? this.selectedSources : this.selectedRulesets;
    const index = selected.indexOf(value);

    if (index >= 0) {
      selected.splice(index, 1);
    } else {
      selected.push(value);
    }
  }

  clearAdvancedFilters(): void {
    this.selectedSources = ['PHB'];
    this.selectedRulesets = ['2014'];
  }

  sortBy(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  getSortIcon(column: SortColumn): string {
    if (this.sortColumn !== column) return '↕';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  getLevelShortTitle(level: number | null): string {
    if (level === null) return 'All';
    if (level === 0) return 'Cantrip';
    const suffix = level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th';
    return `${level}${suffix} lvl`;
  }

  getOrdinalLevel(level: number | null | undefined): string {
    if (level === undefined || level === null) return '-';
    if (level === 0) return 'Cantrip';
    if (level === 1) return '1st';
    if (level === 2) return '2nd';
    if (level === 3) return '3rd';
    return `${level}th`;
  }

  getAttackSave(spellData: any): string {
    if (!spellData) return 'None';
    if (spellData.attackSave) return spellData.attackSave;
    if (Array.isArray(spellData.savingThrows) && spellData.savingThrows.length > 0) {
      return spellData.savingThrows.join(', ');
    }
    return 'None';
  }

  getDamageEffect(spellData: any): string {
    if (!spellData) return 'Utility';
    if (spellData.damageEffect) return spellData.damageEffect;
    if (Array.isArray(spellData.damageTypes) && spellData.damageTypes.length > 0) {
      return spellData.damageTypes.join(', ');
    }
    if (spellData.school === 'Transmutation') return 'Creation (...)';
    return 'Utility';
  }

  private sortSpells(spells: ContentItem[]): ContentItem[] {
    return spells.sort((left, right) => {
      const leftValue = this.sortColumn === 'name'
        ? left.name
        : String(left.data[this.sortColumn] || '');
      const rightValue = this.sortColumn === 'name'
        ? right.name
        : String(right.data[this.sortColumn] || '');
      const comparison = leftValue.localeCompare(rightValue, undefined, { numeric: true });
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  private matchesAdvancedFilters(item: ContentItem): boolean {
    return (this.selectedSources.length === 0 || this.selectedSources.includes(item.source || '')) &&
      (this.selectedRulesets.length === 0 || this.selectedRulesets.includes(item.ruleset || ''));
  }

  get spells(): ContentItem[] {
    return this.allContent.filter(item => item.contentType === 'spell');
  }

  get items(): ContentItem[] {
    return this.allContent.filter(item => item.contentType === 'item');
  }

  get visibleSpells(): ContentItem[] {
    const text = this.searchText.trim().toLowerCase();

    return this.sortSpells(this.spells
      .filter(spell => this.selectedSpellLevel === null || Number(spell.data.level) === this.selectedSpellLevel)
      .filter(spell => this.spellBelongsToSelectedClass(spell))
      .filter(spell => this.matchesAdvancedFilters(spell))
      .filter(spell => !text || spell.searchText.includes(text))
    );
  }

  spellBelongsToSelectedClass(spell: ContentItem): boolean {
    if (this.selectedClass === 'all') return true;

    const selected = this.selectedClass.toLowerCase();
    const classesText = String(spell.data.classesText || '').toLowerCase();

    const classesArray = Array.isArray(spell.data.classes)
      ? spell.data.classes.map((x: string) => String(x).toLowerCase())
      : [];

    if (!classesText && classesArray.length === 0) return true;

    return classesText.includes(selected) || classesArray.includes(selected);
  }

  get filteredItems(): ContentItem[] {
    const text = this.searchText.trim().toLowerCase();

    return this.items
      .filter(item =>
        this.selectedItemCategory === 'all' ||
        item.data.category === this.selectedItemCategory
      )
      .filter(item =>
        this.selectedRarity === 'all' ||
        item.data.rarity === this.selectedRarity
      )
      .filter(item => this.matchesAdvancedFilters(item))
      .filter(item => !text || item.searchText.includes(text))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  getLevelTitle(level: number | null): string {
    if (level === null) return 'All Levels';
    if (level === 0) return 'Cantrips';
    if (level === 1) return '1st Level';
    if (level === 2) return '2nd Level';
    if (level === 3) return '3rd Level';
    return `${level}th Level`;
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchText = input.value;
  }

  closeDetailPanel(): void {
    this.selectedItem = null;
    this.detailNeedsExpansion = false;
  }
}