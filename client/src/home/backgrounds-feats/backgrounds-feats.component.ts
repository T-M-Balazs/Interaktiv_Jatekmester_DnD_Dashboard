import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SystemDataService } from '../../app/services/system-data.service';

type ViewMode = 'backgrounds' | 'feats';

interface ContentEntry {
  id: string;
  name: string;
  contentType: 'background' | 'feat';
  sourceType: 'system' | 'user';
  data: any;
  searchText: string;
  source?: string;
  ruleset?: string;
}

@Component({
  selector: 'app-backgrounds-feats',
  templateUrl: './backgrounds-feats.component.html',
  styleUrls: ['./backgrounds-feats.component.css']
})
export class BackgroundsFeatsComponent implements OnInit {
  viewMode: ViewMode = 'backgrounds';

  searchText = '';
  showAdvancedSearch = false;
  selectedSources: string[] = ['PHB'];
  selectedRulesets: string[] = ['2014'];
  isLoading = false;
  allContent: ContentEntry[] = [];
  selectedEntry: ContentEntry | null = null;

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

      const backgrounds: ContentEntry[] = this.systemData.backgrounds.map(item => ({
        id: item.id,
        name: item.name,
        contentType: 'background',
        sourceType: item.sourceType,
        data: item.data || {},
        searchText: this.systemData.getSearchText(item),
        source: item.source,
        ruleset: item.ruleset
      }));

      const feats: ContentEntry[] = this.systemData.feats.map(item => ({
        id: item.id,
        name: item.name,
        contentType: 'feat',
        sourceType: item.sourceType,
        data: item.data || {},
        searchText: this.systemData.getSearchText(item),
        source: item.source,
        ruleset: item.ruleset
      }));

      this.allContent = [...backgrounds, ...feats];
    } finally {
      this.isLoading = false;
    }
  }

  private openFromGlobalSearch(type: string | null, id: string | null): void {
    if (!type || !id) return;

    if (type !== 'background' && type !== 'feat') return;

    const entry = this.allContent.find(
      item => item.id === id && item.contentType === type
    );

    if (!entry) return;

    this.viewMode = type === 'background' ? 'backgrounds' : 'feats';
    this.selectedEntry = entry;
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    this.selectedEntry = null;
    this.searchText = '';
    this.showAdvancedSearch = false;
  }

  selectEntry(entry: ContentEntry): void {
    this.selectedEntry = entry;
  }

  closeDetailPanel(): void {
    this.selectedEntry = null;
  }

  get backgrounds(): ContentEntry[] {
    return this.allContent.filter(item => item.contentType === 'background');
  }

  get feats(): ContentEntry[] {
    return this.allContent.filter(item => item.contentType === 'feat');
  }

  get currentContent(): ContentEntry[] {
    return this.viewMode === 'backgrounds' ? this.backgrounds : this.feats;
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

  get filteredEntries(): ContentEntry[] {
    const text = this.searchText.trim().toLowerCase();

    return this.currentContent
      .filter(item => this.matchesAdvancedFilters(item))
      .filter(item => !text || item.searchText.includes(text))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private matchesAdvancedFilters(item: ContentEntry): boolean {
    return (this.selectedSources.length === 0 || this.selectedSources.includes(item.source || '')) &&
      (this.selectedRulesets.length === 0 || this.selectedRulesets.includes(item.ruleset || ''));
  }
}