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
}

@Component({
  selector: 'app-backgrounds-feats',
  templateUrl: './backgrounds-feats.component.html',
  styleUrls: ['./backgrounds-feats.component.css']
})
export class BackgroundsFeatsComponent implements OnInit {
  viewMode: ViewMode = 'backgrounds';

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
        data: item.data || {}
      }));

      const feats: ContentEntry[] = this.systemData.feats.map(item => ({
        id: item.id,
        name: item.name,
        contentType: 'feat',
        sourceType: item.sourceType,
        data: item.data || {}
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

  get filteredEntries(): ContentEntry[] {
    const source = this.viewMode === 'backgrounds' ? this.backgrounds : this.feats;

    return source.sort((a, b) => a.name.localeCompare(b.name));
  }
}