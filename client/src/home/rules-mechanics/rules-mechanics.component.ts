import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SystemDataService } from '../../app/services/system-data.service';

interface RuleEntry {
  id: string;
  name: string;
  category: string;
  sourceType: 'system' | 'user';
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
          data
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

  get filteredRules(): RuleEntry[] {
    return this.rules.sort((a, b) => a.name.localeCompare(b.name));
  }
}