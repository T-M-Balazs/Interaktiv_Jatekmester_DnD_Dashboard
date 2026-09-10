import { Injectable } from '@angular/core';
import {
  collection,
  getDocs,
  orderBy,
  query
} from 'firebase/firestore';
import { db } from '../player/firebase-config';

export type SystemContentType =
  | 'spell'
  | 'item'
  | 'class'
  | 'race'
  | 'subclass'
  | 'background'
  | 'feat'
  | 'rule'
  | 'monster'
  | 'content';

export interface SystemContentItem {
  id: string;
  name: string;
  type: SystemContentType;
  sourceType: 'system' | 'user';
  data: any;
  raw: any;
  source?: string;
  ruleset?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SystemDataService {
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;
  private genericContentLoaded = false;
  private genericContentLoadingPromise: Promise<void> | null = null;

  spells: SystemContentItem[] = [];
  items: SystemContentItem[] = [];
  classes: SystemContentItem[] = [];
  races: SystemContentItem[] = [];
  subclasses: SystemContentItem[] = [];
  backgrounds: SystemContentItem[] = [];
  feats: SystemContentItem[] = [];
  rules: SystemContentItem[] = [];
  monsters: SystemContentItem[] = [];
  genericContent: SystemContentItem[] = [];

  async loadAllData(forceReload = false): Promise<void> {
    if (this.loaded && !forceReload) {
      return;
    }

    if (this.loadingPromise && !forceReload) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.loadAllDataInternal();

    try {
      await this.loadingPromise;
      this.loaded = true;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async loadAllDataInternal(): Promise<void> {
    const [
      spells,
      items,
      classes,
      races,
      subclasses,
      backgrounds,
      feats,
      rules,
      monsters
      ] = await Promise.all([
      this.loadCollection('spells', 'spell'),
      this.loadCollection('items', 'item'),
      this.loadCollection('classes', 'class'),
      this.loadCollection('races', 'race'),
      this.loadCollection('subclasses', 'subclass'),
      this.loadCollection('backgrounds', 'background'),
      this.loadCollection('feats', 'feat'),
      this.loadCollection('rules', 'rule'),
      this.loadCollection('monsters', 'monster')
    ]);

    this.spells = spells;
    this.items = items;
    this.classes = classes;
    this.races = races;
    this.subclasses = subclasses;
    this.backgrounds = backgrounds;
    this.feats = feats;
    this.rules = rules;
    this.monsters = monsters;
  }

  async loadGenericContent(forceReload = false): Promise<void> {
    if (this.genericContentLoaded && !forceReload) return;
    if (this.genericContentLoadingPromise && !forceReload) {
      return this.genericContentLoadingPromise;
    }

    this.genericContentLoadingPromise = this.loadCollection('systemContent', 'content')
      .then(items => {
        this.genericContent = items;
        this.genericContentLoaded = true;
      });

    try {
      await this.genericContentLoadingPromise;
    } finally {
      this.genericContentLoadingPromise = null;
    }
  }

  private async loadCollection(
    collectionName: string,
    type: SystemContentType
  ): Promise<SystemContentItem[]> {
    const snap = await getDocs(
      query(collection(db, collectionName), orderBy('name'))
    );

    return snap.docs.map(docSnap => {
      const raw = docSnap.data() as any;
      const data = raw.data || {};

      return {
        id: docSnap.id,
        name: raw.name || data.name || 'Unnamed',
        type,
        sourceType: raw.sourceType || 'system',
        data,
        raw,
        source: raw.source,
        ruleset: raw.ruleset
      };
    });
  }

  getAllSearchItems(): SystemContentItem[] {
    return [
      ...this.spells,
      ...this.items,
      ...this.classes,
      ...this.races,
      ...this.subclasses,
      ...this.backgrounds,
      ...this.feats,
      ...this.rules,
      ...this.monsters,
      ...this.genericContent
    ];
  }

  getSearchText(item: SystemContentItem): string {
    return this.flattenText({
      name: item.name,
      type: item.type,
      source: item.source,
      ruleset: item.ruleset,
      data: item.data,
      raw: item.raw
    }).toLowerCase();
    }

    private flattenText(value: any): string {
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      if (Array.isArray(value)) {
        return value.map(item => this.flattenText(item)).join(' ');
      }
      if (typeof value === 'object') {
        return Object.entries(value)
          .map(([key, item]) => `${key} ${this.flattenText(item)}`)
          .join(' ');
      }
      return '';
    }

  getByTypeAndId(type: SystemContentType, id: string): SystemContentItem | null {
    const source = this.getCollectionByType(type);
    return source.find(item => item.id === id) || null;
  }

  getCollectionByType(type: SystemContentType): SystemContentItem[] {
    switch (type) {
      case 'spell':
        return this.spells;
      case 'item':
        return this.items;
      case 'class':
        return this.classes;
      case 'race':
        return this.races;
      case 'subclass':
        return this.subclasses;
      case 'background':
        return this.backgrounds;
      case 'feat':
        return this.feats;
      case 'rule':
        return this.rules;
      case 'monster':
        return this.monsters;
      case 'content':
        return this.genericContent;
      default:
        return [];
    }
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  clearCache(): void {
    this.loaded = false;
    this.loadingPromise = null;

    this.spells = [];
    this.items = [];
    this.classes = [];
    this.races = [];
    this.subclasses = [];
    this.backgrounds = [];
    this.feats = [];
    this.rules = [];
    this.monsters = [];
    this.genericContent = [];
    this.genericContentLoaded = false;
    this.genericContentLoadingPromise = null;
  }
}