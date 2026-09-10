import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  SystemContentItem,
  SystemDataService
} from '../../app/services/system-data.service';

interface ContentField {
  label: string;
  value: string;
}

@Component({
  selector: 'app-system-content',
  templateUrl: './system-content.component.html',
  styleUrls: ['./system-content.component.css']
})
export class SystemContentComponent implements OnInit {
  isLoading = false;
  searchText = '';
  content: SystemContentItem[] = [];
  selectedItem: SystemContentItem | null = null;

  constructor(
    private route: ActivatedRoute,
    private systemData: SystemDataService
  ) {}

  async ngOnInit(): Promise<void> {
    this.isLoading = true;

    try {
      await this.systemData.loadGenericContent();
      this.content = this.systemData.genericContent;
    } finally {
      this.isLoading = false;
    }

    this.route.queryParamMap.subscribe(params => {
      const id = params.get('id');
      if (params.get('type') === 'content' && id) {
        this.selectedItem = this.content.find(item => item.id === id) || null;
      }
    });
  }

  get filteredContent(): SystemContentItem[] {
    const text = this.searchText.trim().toLowerCase();

    return this.content
      .filter(item => !text || this.systemData.getSearchText(item).includes(text))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  selectItem(item: SystemContentItem): void {
    this.selectedItem = item;
  }

  closeDetailPanel(): void {
    this.selectedItem = null;
  }

  getFields(item: SystemContentItem): ContentField[] {
    const fields: ContentField[] = [];
    this.flatten(item.data, '', fields, 0);
    return fields;
  }

  private flatten(value: any, path: string, fields: ContentField[], depth: number): void {
    if (value === null || value === undefined || depth > 5) return;

    if (typeof value !== 'object') {
      fields.push({
        label: path || 'Value',
        value: String(value)
      });
      return;
    }

    if (Array.isArray(value)) {
      if (value.every(item => typeof item !== 'object')) {
        fields.push({ label: path || 'Values', value: value.join(', ') });
        return;
      }

      value.forEach((item, index) => {
        this.flatten(item, `${path || 'Values'} ${index + 1}`, fields, depth + 1);
      });
      return;
    }

    Object.entries(value).forEach(([key, child]) => {
      const label = path ? `${path} / ${key}` : key;
      this.flatten(child, label, fields, depth + 1);
    });
  }
}
