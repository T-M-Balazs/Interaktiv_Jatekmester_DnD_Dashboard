import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SystemDataService } from '../../app/services/system-data.service';

interface RuleEntry {
  id: string;
  name: string;
  category: string;
  sourceType: 'system' | 'user';
  searchText: string;
  source?: string;
  ruleset?: string;
  data: {
    shortDescription?: string;
    summary?: string;
    description?: string;
    examples?: string[];
    steps?: string[];
    relatedRules?: string[];
  };
}

@Component({
  selector: 'app-rules-mechanics',
  templateUrl: './rules-mechanics.component.html',
  styleUrls: ['./rules-mechanics.component.css']
})
export class RulesMechanicsComponent implements OnInit {
  isLoading = false;
  rules: RuleEntry[] = [];
  selectedRule: RuleEntry | null = null;
  searchText = '';
  showAdvancedSearch = false;
  selectedSources: string[] = ['PHB'];
  selectedRulesets: string[] = ['2014'];

  constructor(
    private route: ActivatedRoute,
    private systemData: SystemDataService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadRules();

    this.route.queryParamMap.subscribe(params => {
      this.openFromGlobalSearch(params.get('type'), params.get('id'));
    });
  }

  async loadRules(): Promise<void> {
    this.isLoading = true;

    try {
      await this.systemData.loadAllData();

      this.rules = this.systemData.rules.map(item => {
        const raw = item.raw || {};
        const data = item.data || {};

        return {
          id: item.id,
          name: item.name || raw.name || data.name || 'Unnamed Rule',
          category: raw.category || data.category || 'General',
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
    if (type !== 'rule' || !id) return;

    const rule = this.rules.find(item => item.id === id);

    if (!rule) return;

    this.selectedRule = rule;
  }

  selectRule(rule: RuleEntry): void {
    this.selectedRule = rule;
  }

  closeDetailPanel(): void {
    this.selectedRule = null;
  }

  get availableSources(): string[] {
    return this.uniqueMetadata(this.rules.map(rule => rule.source));
  }

  get availableRulesets(): string[] {
    return this.uniqueMetadata(this.rules.map(rule => rule.ruleset));
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

  clearAdvancedFilters(): void {
    this.selectedSources = ['PHB'];
    this.selectedRulesets = ['2014'];
  }

  get filteredRules(): RuleEntry[] {
    const text = this.searchText.trim().toLowerCase();

    return this.rules
      .filter(rule => this.matchesAdvancedFilters(rule))
      .filter(rule => !text || rule.searchText.includes(text))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private matchesAdvancedFilters(rule: RuleEntry): boolean {
    return (this.selectedSources.length === 0 || this.selectedSources.includes(rule.source || '')) &&
      (this.selectedRulesets.length === 0 || this.selectedRulesets.includes(rule.ruleset || ''));
  }

  private uniqueMetadata(values: Array<string | undefined>): string[] {
    return Array.from(new Set(values.filter((value): value is string => !!value))).sort();
  }
}