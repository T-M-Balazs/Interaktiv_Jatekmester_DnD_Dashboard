import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import { auth, db } from '../player/firebase-config';

export type MechanicType = 'counter' | 'checkbox' | 'progress' | 'slider' | 'dropdown';
export type MechanicScope = 'global' | 'perCharacter';
export type NameGender = 'male' | 'female' | 'neutral';

export interface SessionCharacter {
  id: string;
  name: string;
  race: string;
  description: string;
  imageUrl?: string;
}

export interface SessionLocation {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
}

export interface SessionMechanic {
  id: string;
  name: string;
  description: string;
  type: MechanicType;
  scope: MechanicScope;
  min: number;
  max: number;
  defaultValue: number | boolean | string;
  options: string[];
  globalValue: number | boolean | string;
  characterValues: Record<string, number | boolean | string>;
}

export interface SessionData {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  createdAt?: any;
  updatedAt?: any;
  players: SessionCharacter[];
  npcs: SessionCharacter[];
  locations: SessionLocation[];
  mechanics: SessionMechanic[];
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly collectionName = 'sessions';

  async listSessions(): Promise<SessionData[]> {
    const ownerId = auth.currentUser?.uid;
    if (!ownerId) return [];

    const snapshot = await getDocs(query(
      collection(db, this.collectionName),
      where('ownerId', '==', ownerId)
    ));
    return snapshot.docs
      .map(item => this.normalizeSession({ id: item.id, ...item.data() } as SessionData))
      .filter(item => item.ownerId === ownerId)
      .sort((a, b) => this.timestampValue(b.updatedAt) - this.timestampValue(a.updatedAt));
  }

  async createSession(name: string, description: string): Promise<SessionData> {
    const ownerId = auth.currentUser?.uid;
    if (!ownerId) throw new Error('A session létrehozásához be kell jelentkezni.');

    const reference = await addDoc(collection(db, this.collectionName), {
      ownerId,
      name: name.trim(),
      description: description.trim(),
      players: [],
      npcs: [],
      locations: [],
      mechanics: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return this.normalizeSession({
      id: reference.id,
      ownerId,
      name: name.trim(),
      description: description.trim(),
      players: [],
      npcs: [],
      locations: [],
      mechanics: []
    });
  }

  async saveSession(session: SessionData): Promise<void> {
    const ownerId = auth.currentUser?.uid;
    if (!ownerId || ownerId !== session.ownerId) {
      throw new Error('Nincs jogosultságod ehhez a sessionhöz.');
    }

    await setDoc(doc(db, this.collectionName, session.id), {
      ownerId: session.ownerId,
      name: session.name.trim(),
      description: session.description.trim(),
      players: session.players,
      npcs: session.npcs,
      locations: session.locations,
      mechanics: session.mechanics,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  async deleteSession(sessionId: string, ownerId: string): Promise<void> {
    if (!auth.currentUser || auth.currentUser.uid !== ownerId) {
      throw new Error('Nincs jogosultságod ehhez a sessionhöz.');
    }
    await deleteDoc(doc(db, this.collectionName, sessionId));
  }

  createMechanic(input: {
    name: string;
    description: string;
    type: MechanicType;
    scope: MechanicScope;
    min: number;
    max: number;
    defaultValue: number | boolean | string;
    options: string[];
  }, players: SessionCharacter[]): SessionMechanic {
    const defaultValue = this.clampValue(input.defaultValue, input);
    const characterValues: Record<string, number | boolean | string> = {};
    if (input.scope === 'perCharacter') {
      players.forEach(player => characterValues[player.id] = defaultValue);
    }

    return {
      id: this.createId(),
      name: input.name.trim(),
      description: input.description.trim(),
      type: input.type,
      scope: input.scope,
      min: input.min,
      max: Math.max(input.min, input.max),
      defaultValue,
      options: input.options,
      globalValue: defaultValue,
      characterValues
    };
  }

  addPlayerToMechanics(session: SessionData, playerId: string): void {
    session.mechanics
      .filter(mechanic => mechanic.scope === 'perCharacter')
      .forEach(mechanic => {
        mechanic.characterValues[playerId] ??= mechanic.defaultValue;
      });
  }

  removePlayerFromMechanics(session: SessionData, playerId: string): void {
    session.mechanics.forEach(mechanic => delete mechanic.characterValues[playerId]);
  }

  clampValue(value: number | boolean | string, mechanic: Pick<SessionMechanic, 'type' | 'min' | 'max' | 'options'>): number | boolean | string {
    if (mechanic.type === 'checkbox') return Boolean(value);
    if (mechanic.type === 'dropdown') return mechanic.options.includes(String(value)) ? String(value) : (mechanic.options[0] || '');
    const numeric = Number(value);
    return Math.min(mechanic.max, Math.max(mechanic.min, Number.isFinite(numeric) ? numeric : mechanic.min));
  }

  private normalizeSession(raw: SessionData): SessionData {
    return {
      id: raw.id,
      ownerId: raw.ownerId || '',
      name: raw.name || 'Névtelen session',
      description: raw.description || '',
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      players: Array.isArray(raw.players) ? raw.players : [],
      npcs: Array.isArray(raw.npcs) ? raw.npcs : [],
      locations: Array.isArray(raw.locations) ? raw.locations : [],
      mechanics: Array.isArray(raw.mechanics) ? raw.mechanics.map(item => ({
        ...item,
        min: Number(item.min ?? 0),
        max: Number(item.max ?? 10),
        options: Array.isArray(item.options) ? item.options : [],
        characterValues: item.characterValues || {}
      })) : []
    };
  }

  private timestampValue(value: any): number {
    return value?.toMillis?.() || value?.seconds * 1000 || 0;
  }

  private createId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
