import { Component } from '@angular/core';
import {
  SystemContentType,
  SystemDataService
} from '../../services/system-data.service';

type SearchType = SystemContentType;

interface SearchResult {
  id: string;
  name: string;
  type: SearchType;
  data: any;
}

@Component({
  selector: 'app-search-widget',
  templateUrl: './search-widget.component.html',
  styleUrls: ['./search-widget.component.css']
})
export class SearchWidgetComponent {
  searchText = '';
  results: SearchResult[] = [];
  selectedResult: SearchResult | null = null;
  isLoading = false;

  constructor(private systemData: SystemDataService) {}

  async onSearchChange(): Promise<void> {
    const text = this.searchText.trim().toLowerCase();

    if (text.length < 2) {
      this.results = [];
      this.selectedResult = null;
      return;
    }

    this.isLoading = true;

    try {
      await this.systemData.loadAllData();

      const all = this.systemData.getAllSearchItems().map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        data: {
          ...item.raw,
          ...(item.data || {})
        }
      }));

      this.results = all
        .filter(item => item.name.toLowerCase().includes(text))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 50);
    } finally {
      this.isLoading = false;
    }
  }

  selectResult(result: SearchResult): void {
    this.selectedResult = result;
  }

  clearSearch(): void {
    this.searchText = '';
    this.results = [];
    this.selectedResult = null;
  }

  getSpellLevelText(level: any): string {
    const value = Number(level);

    if (value === 0) {
      return 'Cantrip';
    }

    if (!Number.isNaN(value)) {
      return `${value}. level`;
    }

    return 'Unknown level';
  }

  getAbilityModifier(score: any): string {
    const value = Number(score);

    if (Number.isNaN(value)) {
      return '+0';
    }

    const modifier = Math.floor((value - 10) / 2);

    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
  }

  asArray(value: any): any[] {
    if (!value) {
      return [];
    }

    return Array.isArray(value) ? value : [value];
  }
}