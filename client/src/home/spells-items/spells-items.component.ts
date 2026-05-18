import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SystemDataService } from '../../app/services/system-data.service';

type ViewMode = 'spells' | 'items';

interface ContentItem {
  id: string;
  name: string;
  contentType: 'spell' | 'item';
  sourceType: 'system' | 'user';
  data: any;
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

  selectedClass = 'all';
  selectedSpellLevel = 0;

  selectedItemCategory = 'all';
  selectedRarity = 'all';

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
        data: item.data || {}
      }));

      const items: ContentItem[] = this.systemData.items.map(item => ({
        id: item.id,
        name: item.name,
        contentType: 'item',
        sourceType: item.sourceType,
        data: item.data || {}
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
    this.selectedItem = null;
    this.searchText = '';
    this.selectedSpellLevel = 0;
  }

  selectClass(className: string): void {
    this.selectedClass = className;
    this.selectedSpellLevel = 0;
    this.selectedItem = null;
  }

  selectSpellLevel(level: number): void {
    this.selectedSpellLevel = level;
    this.selectedItem = null;
  }

  selectItem(item: ContentItem): void {
    this.selectedItem = item;
  }

  get spells(): ContentItem[] {
    return this.allContent.filter(item => item.contentType === 'spell');
  }

  get items(): ContentItem[] {
    return this.allContent.filter(item => item.contentType === 'item');
  }

  get visibleSpells(): ContentItem[] {
    const text = this.searchText.trim().toLowerCase();

    return this.spells
      .filter(spell => Number(spell.data.level) === this.selectedSpellLevel)
      .filter(spell => this.spellBelongsToSelectedClass(spell))
      .filter(spell => !text || spell.name.toLowerCase().includes(text))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  spellBelongsToSelectedClass(spell: ContentItem): boolean {
    if (this.selectedClass === 'all') return true;

    const selected = this.selectedClass.toLowerCase();
    const classesText = String(spell.data.classesText || '').toLowerCase();

    const classesArray = Array.isArray(spell.data.classes)
      ? spell.data.classes.map((x: string) => String(x).toLowerCase())
      : [];

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
      .filter(item => !text || item.name.toLowerCase().includes(text))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  getLevelTitle(level: number): string {
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
  }
}