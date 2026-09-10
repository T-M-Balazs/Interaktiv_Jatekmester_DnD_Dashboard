import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SystemDataService } from '../../app/services/system-data.service';
import { CLASSES_RACES_CONTENT } from './classes-races-data-template';

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
  searchText: string;
  source?: string;
  ruleset?: string;
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
  showAdvancedSearch = false;
  selectedSources: string[] = ['PHB'];
  selectedRulesets: string[] = ['2014'];
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

      const systemClasses: ContentEntry[] = this.systemData.classes.map(item => ({
        id: item.id,
        name: item.name,
        contentType: 'class',
        sourceType: item.sourceType,
        data: item.data || {},
        searchText: this.systemData.getSearchText(item),
        source: item.source,
        ruleset: item.ruleset
      }));

      const systemRaces: ContentEntry[] = this.systemData.races.map(item => ({
        id: item.id,
        name: item.name,
        contentType: 'race',
        sourceType: item.sourceType,
        data: item.data || {},
        searchText: this.systemData.getSearchText(item),
        source: item.source,
        ruleset: item.ruleset
      }));

      const templateEntries: ContentEntry[] = CLASSES_RACES_CONTENT.map(item => ({
        id: item.id,
        name: item.name,
        contentType: item.collectionName === 'classes' ? 'class' : 'race',
        sourceType: 'system',
        data: item.data || {},
        searchText: JSON.stringify(item).toLowerCase(),
        source: 'PHB',
        ruleset: '2014'
      }));

      // Combine seed/template data with loaded system data and deduplicate by name
      this.allContent = this.deduplicateEntries([
        ...templateEntries,
        ...systemClasses,
        ...systemRaces
      ]);

      // Attach all matching subclasses from systemData.subclasses to each class entry
      for (const entry of this.allContent) {
        if (entry.contentType === 'class') {
          const classNameLower = entry.name.trim().toLowerCase();
          const existingSubs = entry.data.subclasses || entry.data.subclassRefs || [];

          const subMap = new Map<string, any>();
          for (const sub of existingSubs) {
            if (!sub?.name) continue;
            subMap.set(sub.name.trim().toLowerCase(), sub);
          }

          // Find matching subclasses from Firestore systemData.subclasses
          for (const subItem of this.systemData.subclasses) {
            const raw = subItem.raw || {};
            const data = subItem.data || {};
            const subClassName = String(raw.className || data.className || raw.classId || data.classId || '').trim().toLowerCase();

            if (subClassName === classNameLower || (entry.id && subClassName === entry.id.toLowerCase())) {
              const subKey = subItem.name.trim().toLowerCase();
              const existing = subMap.get(subKey);

              if (!existing || (!existing.features?.length && data.features?.length)) {
                subMap.set(subKey, {
                  id: subItem.id,
                  name: subItem.name,
                  source: subItem.source || data.source || existing?.source,
                  shortDescription: data.shortDescription || existing?.shortDescription || '',
                  description: data.description || existing?.description || '',
                  features: data.features || existing?.features || [],
                  tableRows: data.tableRows || existing?.tableRows || [],
                  tableColumns: data.tableColumns || existing?.tableColumns || [],
                  isPhb: data.isPhb ?? existing?.isPhb ?? (subItem.source === 'PHB' || subItem.source === 'XPHB'),
                  bookGroup: data.bookGroup || existing?.bookGroup || (subItem.source === 'PHB' || subItem.source === 'XPHB' ? 'phb' : 'expanded')
                });
              }
            }
          }

          entry.data.subclasses = Array.from(subMap.values());
          entry.data.subclassRefs = Array.from(subMap.values());
        }
      }
    } finally {
      this.isLoading = false;
    }
  }

  private deduplicateEntries(entries: ContentEntry[]): ContentEntry[] {
    const map = new Map<string, ContentEntry>();

    for (const entry of entries) {
      if (!entry || !entry.name) continue;

      const key = `${entry.contentType}:${entry.name.trim().toLowerCase()}`;

      if (!map.has(key)) {
        map.set(key, {
          ...entry,
          data: { ...(entry.data || {}) },
          searchText: entry.searchText,
          source: entry.source,
          ruleset: entry.ruleset
        });
      } else {
        const existing = map.get(key)!;
        existing.data = this.mergeData(existing.data, entry.data);
        existing.searchText = `${existing.searchText} ${entry.searchText}`;
        existing.source = existing.source || entry.source;
        existing.ruleset = existing.ruleset || entry.ruleset;
      }
    }

    return Array.from(map.values());
  }

  private mergeData(target: any, source: any): any {
    if (!target) return { ...(source || {}) };
    if (!source) return { ...(target || {}) };

    // Prefer whichever side actually has more complete level progression data, not just "some" data
    // (a hand-written template with only 3 levels shouldn't win over a full 20-level import).
    const completeness = (data: any) => (data.classTable?.length || 0) + (data.features?.length || 0);
    const primary = completeness(target) >= completeness(source) ? target : source;
    const secondary = primary === target ? source : target;

    const result = { ...primary };

    // Use shortDescription and description from primary if available
    result.shortDescription = primary.shortDescription || secondary.shortDescription || '';
    result.description = primary.description || secondary.description || '';

    // Merge proficiencies intelligently
    result.proficiencies = {
      armor: primary.proficiencies?.armor || secondary.proficiencies?.armor || '',
      weapons: primary.proficiencies?.weapons || secondary.proficiencies?.weapons || '',
      tools: primary.proficiencies?.tools || secondary.proficiencies?.tools || '',
      savingThrows: primary.proficiencies?.savingThrows || secondary.proficiencies?.savingThrows || '',
      skills: primary.proficiencies?.skills || secondary.proficiencies?.skills || ''
    };

    // Clean proficiencies strings if they were dump objects/arrays
    for (const key of ['armor', 'weapons', 'tools', 'savingThrows', 'skills'] as const) {
      if (typeof result.proficiencies[key] !== 'string') {
        result.proficiencies[key] = String(result.proficiencies[key] || '');
      }
    }

    // Merge equipment
    result.equipment = (primary.equipment && primary.equipment.length > 0) ? primary.equipment : (secondary.equipment || []);

    // Merge classTable & classTableColumns, keeping whichever table is more complete
    if (!result.classTable || result.classTable.length < (secondary.classTable?.length || 0)) {
      result.classTable = secondary.classTable || result.classTable || [];
      result.classTableColumns = secondary.classTableColumns || result.classTableColumns || [];
    }

    // Keep whichever feature list is more complete
    if (!primary.features || primary.features.length < (secondary.features?.length || 0)) {
      result.features = secondary.features || primary.features || [];
    } else {
      result.features = primary.features;
    }

    // Merge ALL subclasses / subclassRefs without losing any!
    const primarySubclasses = primary.subclasses || primary.subclassRefs || [];
    const secondarySubclasses = secondary.subclasses || secondary.subclassRefs || [];

    const subMap = new Map<string, any>();
    for (const sub of [...primarySubclasses, ...secondarySubclasses]) {
      if (!sub?.name) continue;
      const subKey = sub.name.trim().toLowerCase();
      if (!subMap.has(subKey) || (sub.features && sub.features.length > 0)) {
        subMap.set(subKey, sub);
      }
    }
    result.subclassRefs = Array.from(subMap.values());
    result.subclasses = Array.from(subMap.values());

    // Race specific
    if (!result.abilityScoreIncrease && secondary.abilityScoreIncrease) {
      result.abilityScoreIncrease = secondary.abilityScoreIncrease;
    }
    if (!result.traits || result.traits.length === 0) {
      result.traits = secondary.traits || [];
    }
    if (!result.subraces || result.subraces.length === 0) {
      result.subraces = secondary.subraces || [];
    }

    return result;
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
    this.showAdvancedSearch = false;
  }

  selectEntry(entry: ContentEntry): void {
    this.selectedEntry = entry;
    this.selectedSubclass = null;
  }

  async selectSubclass(subclassRef: { id?: string; name: string }): Promise<void> {
    if (!subclassRef?.name && !subclassRef?.id) return;

    this.isSubclassLoading = true;

    try {
      await this.systemData.loadAllData();

      // Find in embedded selectedEntry.data.subclasses or subclassRefs
      const embeddedList = [
        ...(this.selectedEntry?.data?.subclasses || []),
        ...(this.selectedEntry?.data?.subclassRefs || [])
      ];

      const embedded = embeddedList.find(
        (s: any) =>
          (subclassRef.id && s.id === subclassRef.id) ||
          (s.name && s.name.trim().toLowerCase() === subclassRef.name.trim().toLowerCase())
      );

      // Find in systemData.subclasses
      const subclassItem = this.systemData.subclasses.find(
        item =>
          (subclassRef.id && item.id === subclassRef.id) ||
          item.name.trim().toLowerCase() === subclassRef.name.trim().toLowerCase()
      );

      const combinedData = {
        ...(subclassItem?.data || {}),
        ...(embedded || {})
      };

      // Ensure features, description, and source are preserved from whichever source has them
      if ((!combinedData.features || combinedData.features.length === 0) && subclassItem?.data?.features?.length) {
        combinedData.features = subclassItem.data.features;
      }
      if ((!combinedData.description || combinedData.description.length < 10) && subclassItem?.data?.description) {
        combinedData.description = subclassItem.data.description;
      }
      if (!combinedData.source && subclassItem?.source) {
        combinedData.source = subclassItem.source;
      }

      this.selectedSubclass = {
        id: subclassItem?.id || embedded?.id || subclassRef.id || subclassRef.name,
        name: subclassItem?.name || embedded?.name || subclassRef.name,
        classId: this.selectedEntry?.id || '',
        className: this.selectedEntry?.name || '',
        sourceType: 'system',
        data: combinedData
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

  get currentContent(): ContentEntry[] {
    return this.viewMode === 'classes' ? this.classes : this.races;
  }

  get availableSources(): string[] {
    return this.uniqueMetadata(this.currentContent.map(item => item.source));
  }

  get availableRulesets(): string[] {
    return this.uniqueMetadata(this.currentContent.map(item => item.ruleset));
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

  private uniqueMetadata(values: Array<string | undefined>): string[] {
    return Array.from(new Set(values.filter((value): value is string => !!value))).sort();
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

  getPhbSubclasses(entry: ContentEntry): any[] {
    return (entry?.data?.subclasses || entry?.data?.subclassRefs || []).filter((sub: any) => sub.isPhb);
  }

  getExpandedSubclasses(entry: ContentEntry): any[] {
    return (entry?.data?.subclasses || entry?.data?.subclassRefs || []).filter((sub: any) => !sub.isPhb);
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