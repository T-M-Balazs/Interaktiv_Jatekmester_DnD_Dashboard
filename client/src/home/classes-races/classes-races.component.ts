import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SystemDataService } from '../../app/services/system-data.service';

type ViewMode = 'classes' | 'races';

interface TableColumn {
  key: string;
  label: string;
}

interface ContentEntry {
  id: string;
  name: string;
  contentType: 'class' | 'race';
  sourceType: 'system' | 'user';
  data: any;
}

interface SubclassEntry {
  id: string;
  name: string;
  classId: string;
  className: string;
  sourceType: 'system' | 'user';
  data: any;
}

@Component({
  selector: 'app-classes-races',
  templateUrl: './classes-races.component.html',
  styleUrls: ['./classes-races.component.css']
})
export class ClassesRacesComponent implements OnInit {
  viewMode: ViewMode = 'classes';

  searchText = '';
  isLoading = false;
  isSubclassLoading = false;

  allContent: ContentEntry[] = [];
  selectedEntry: ContentEntry | null = null;
  selectedSubclass: SubclassEntry | null = null;

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

      const classes: ContentEntry[] = this.systemData.classes.map(item => ({
        id: item.id,
        name: item.name,
        contentType: 'class',
        sourceType: item.sourceType,
        data: item.data || {}
      }));

      const races: ContentEntry[] = this.systemData.races.map(item => ({
        id: item.id,
        name: item.name,
        contentType: 'race',
        sourceType: item.sourceType,
        data: item.data || {}
      }));

      this.allContent = [...classes, ...races];
    } finally {
      this.isLoading = false;
    }
  }

  private openFromGlobalSearch(type: string | null, id: string | null): void {
    if (!type || !id) return;

    if (type === 'class' || type === 'race') {
      const entry = this.allContent.find(
        item => item.id === id && item.contentType === type
      );

      if (!entry) return;

      this.searchText = '';
      this.viewMode = type === 'class' ? 'classes' : 'races';
      this.selectedEntry = entry;
      this.selectedSubclass = null;
      return;
    }

    if (type === 'subclass') {
      this.searchText = '';
      this.viewMode = 'classes';
      this.isSubclassLoading = true;

      try {
        const subclassItem = this.systemData.subclasses.find(item => item.id === id);

        if (!subclassItem) return;

        const raw = subclassItem.raw || {};
        const subclassData = subclassItem.data || {};

        const classId =
          raw.classId ||
          subclassData.classId ||
          raw.parentClassId ||
          subclassData.parentClassId ||
          '';

        const className =
          raw.className ||
          subclassData.className ||
          '';

        let parentClass = this.allContent.find(
          item => item.contentType === 'class' && item.id === classId
        );

        if (!parentClass && className) {
          parentClass = this.allContent.find(
            item =>
              item.contentType === 'class' &&
              item.name.toLowerCase() === String(className).toLowerCase()
          );
        }

        if (parentClass) {
          this.selectedEntry = parentClass;
        }

        this.selectedSubclass = {
          id: subclassItem.id,
          name: subclassItem.name || subclassData.name || 'Unnamed Subclass',
          classId: classId || parentClass?.id || '',
          className: className || parentClass?.name || '',
          sourceType: subclassItem.sourceType || 'system',
          data: subclassData
        };
      } finally {
        this.isSubclassLoading = false;
      }
    }
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    this.selectedEntry = null;
    this.selectedSubclass = null;
    this.searchText = '';
  }

  selectEntry(entry: ContentEntry): void {
    this.selectedEntry = entry;
    this.selectedSubclass = null;
  }

  async selectSubclass(subclassRef: { id: string; name: string }): Promise<void> {
    if (!subclassRef?.id) return;

    this.isSubclassLoading = true;

    try {
      await this.systemData.loadAllData();

      const subclassItem = this.systemData.subclasses.find(
        item => item.id === subclassRef.id
      );

      if (!subclassItem) {
        this.selectedSubclass = {
          id: subclassRef.id,
          name: subclassRef.name,
          classId: this.selectedEntry?.id || '',
          className: this.selectedEntry?.name || '',
          sourceType: 'system',
          data: {
            shortDescription: 'Ehhez a subclasshoz még nincs feltöltött adat.',
            features: [],
            tableColumns: [],
            tableRows: []
          }
        };

        return;
      }

      const raw = subclassItem.raw || {};
      const data = subclassItem.data || {};

      this.selectedSubclass = {
        id: subclassItem.id,
        name: subclassItem.name || subclassRef.name,
        classId: raw.classId || data.classId || this.selectedEntry?.id || '',
        className: raw.className || data.className || this.selectedEntry?.name || '',
        sourceType: subclassItem.sourceType || 'system',
        data
      };
    } finally {
      this.isSubclassLoading = false;
    }
  }

  closeSubclassPanel(): void {
    this.selectedSubclass = null;
  }

  get classes(): ContentEntry[] {
    return this.allContent.filter(item => item.contentType === 'class');
  }

  get races(): ContentEntry[] {
    return this.allContent.filter(item => item.contentType === 'race');
  }

  get filteredEntries(): ContentEntry[] {
    const text = this.searchText.trim().toLowerCase();
    const source = this.viewMode === 'classes' ? this.classes : this.races;

    return source
      .filter(item => !text || item.name.toLowerCase().includes(text))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  getTableColumns(entry: ContentEntry): TableColumn[] {
    return entry?.data?.classTableColumns || [];
  }

  getTableRows(entry: ContentEntry): any[] {
    return entry?.data?.classTable || [];
  }

  getSubclassTableColumns(subclass: SubclassEntry): TableColumn[] {
    return subclass?.data?.tableColumns || [];
  }

  getSubclassTableRows(subclass: SubclassEntry): any[] {
    return subclass?.data?.tableRows || [];
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchText = input.value;
  }

  closeDetailPanel(): void {
    this.selectedEntry = null;
    this.selectedSubclass = null;
  }
}