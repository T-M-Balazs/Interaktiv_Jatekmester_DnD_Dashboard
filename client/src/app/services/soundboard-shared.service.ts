import { Injectable } from '@angular/core';
import { db, storage } from '../player/firebase-config';
import { AudioStateService, AudioSource } from './audio-state.service';

import {
  ref,
  getDownloadURL,
  listAll,
  deleteObject
} from 'firebase/storage';

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';

export interface SfxTrack {
  title: string;
  url: string;
  path: string;
  duration: number;
}

export interface BoardSlot {
  sfxUrl: string | null;
  label: string | null;
}

export interface Soundboard {
  id: string;
  name: string;
  slots: BoardSlot[];
}

@Injectable({
  providedIn: 'root'
})
export class SoundboardSharedService {
  private audioSource: AudioSource = 'soundboard';
  private static boardsLoaded = false;
private static sfxLoaded = false;

private static boardsLoadingPromise: Promise<void> | null = null;
private static sfxLoadingPromise: Promise<void> | null = null;

private static cachedBoards: Soundboard[] = [];
private static cachedSfx: SfxTrack[] = [];
  boards: Soundboard[] = [];
  selectedBoardId: string | null = null;
  selectedSlotIndex: number | null = null;

  allSfx: SfxTrack[] = [];
  filteredSfx: SfxTrack[] = [];
  searchTerm = '';

  isPlaying = false;
  volume = 1;

  isMuted = false;
  private previousVolume = 1;

  private audio: HTMLAudioElement | null = null;
  constructor(private audioState: AudioStateService) {}
setAudioSource(source: AudioSource): void {
  this.audioSource = source;
}
  get selectedBoard(): Soundboard | null {
    return this.boards.find(b => b.id === this.selectedBoardId) || null;
  }

  createEmptySlots(): BoardSlot[] {
    return Array.from({ length: 12 }, () => ({
      sfxUrl: null,
      label: null
    }));
  }

  private normalizeSlots(slots: any): BoardSlot[] {
    const empty = this.createEmptySlots();

    if (!Array.isArray(slots)) {
      return empty;
    }

    for (let i = 0; i < Math.min(slots.length, 12); i++) {
      const slot = slots[i];

      if (!slot) continue;

      empty[i] = {
        sfxUrl: slot.sfxUrl || slot.url || null,
        label: slot.label || slot.title || slot.name || null
      };
    }

    return empty;
  }

async loadBoards(forceReload = false): Promise<void> {
  if (SoundboardSharedService.boardsLoaded && !forceReload) {
    this.boards = [...SoundboardSharedService.cachedBoards];

    if (!this.selectedBoardId && this.boards.length) {
      this.selectBoard(this.boards[0].id);
    }

    return;
  }

  if (SoundboardSharedService.boardsLoadingPromise && !forceReload) {
    await SoundboardSharedService.boardsLoadingPromise;
    this.boards = [...SoundboardSharedService.cachedBoards];

    if (!this.selectedBoardId && this.boards.length) {
      this.selectBoard(this.boards[0].id);
    }

    return;
  }

  SoundboardSharedService.boardsLoadingPromise = this.loadBoardsInternal();

  try {
    await SoundboardSharedService.boardsLoadingPromise;
  } finally {
    SoundboardSharedService.boardsLoadingPromise = null;
  }
}
private async loadBoardsInternal(): Promise<void> {
  const snap = await getDocs(
    query(collection(db, 'soundboards'), orderBy('createdAt'))
  );

  this.boards = snap.docs.map(d => {
    const data = d.data() as any;

    return {
      id: d.id,
      name: data.name || 'Névtelen board',
      slots: this.normalizeSlots(data.slots)
    };
  });

  SoundboardSharedService.cachedBoards = [...this.boards];
  SoundboardSharedService.boardsLoaded = true;

  if (!this.selectedBoardId && this.boards.length) {
    this.selectBoard(this.boards[0].id);
  }

  if (this.selectedBoardId && !this.selectedBoard) {
    this.selectedBoardId = this.boards[0]?.id || null;
  }
}

  selectBoard(id: string): void {
    this.selectedBoardId = id;
    this.selectedSlotIndex = null;
  }

  async createBoard(name: string): Promise<Soundboard | null> {
    const cleanName = name.trim();

    if (!cleanName) return null;

    const slots = this.createEmptySlots();

    const newRef = await addDoc(collection(db, 'soundboards'), {
      name: cleanName,
      slots,
      createdAt: serverTimestamp()
    });

    const board: Soundboard = {
      id: newRef.id,
      name: cleanName,
      slots
    };

    this.boards.push(board);
    this.selectBoard(newRef.id);

    return board;
  }

  async deleteBoard(id: string): Promise<void> {
    await deleteDoc(doc(db, 'soundboards', id));

    this.boards = this.boards.filter(b => b.id !== id);

    if (this.selectedBoardId === id) {
      this.selectedBoardId = this.boards[0]?.id || null;
      this.selectedSlotIndex = null;
    }
  }

  async saveBoard(board: Soundboard): Promise<void> {
    await updateDoc(doc(db, 'soundboards', board.id), {
      name: board.name,
      slots: board.slots
    });
  }

  selectSlot(index: number): void {
    this.selectedSlotIndex = index;
  }

  getSlotName(board: Soundboard, index: number): string {
    const slot = board.slots[index];

    if (!slot?.sfxUrl) return 'Üres';

    const track = this.allSfx.find(t =>
      t.url === slot.sfxUrl || t.path === slot.sfxUrl
    );

    return slot.label || track?.title || `Slot ${index + 1}`;
  }

  async assignToSlot(track: SfxTrack): Promise<void> {
    const board = this.selectedBoard;

    if (!board || this.selectedSlotIndex === null) return;

    board.slots[this.selectedSlotIndex] = {
      sfxUrl: track.url || track.path,
      label: track.title
    };

    await this.saveBoard(board);
  }

  async clearSlot(): Promise<void> {
    const board = this.selectedBoard;

    if (!board || this.selectedSlotIndex === null) return;

    board.slots[this.selectedSlotIndex] = {
      sfxUrl: null,
      label: null
    };

    await this.saveBoard(board);
  }

  private async resolveAudioUrl(value: string): Promise<string> {
    if (value.startsWith('http')) {
      return value;
    }

    return await getDownloadURL(ref(storage, value));
  }

  async playSlot(index: number): Promise<void> {
    const board = this.selectedBoard;

    if (!board) {
      console.warn('Nincs kiválasztott soundboard.');
      return;
    }

    const slot = board.slots[index];

    if (!slot?.sfxUrl) {
      console.warn('Ebben a slotban nincs hang:', index);
      return;
    }

    this.stopSlot();

    try {
      const audioUrl = await this.resolveAudioUrl(slot.sfxUrl);

      const audio = new Audio(audioUrl);

      audio.preload = 'auto';
      audio.volume = this.isMuted ? 0 : this.volume;
      audio.currentTime = 0;

      audio.onended = () => {
        this.isPlaying = false;
        this.audioState.stop(this.audioSource);
      };

      audio.onerror = () => {
        console.error('Audio betöltési hiba:', audioUrl);
        this.isPlaying = false;
        this.audioState.stop(this.audioSource);
      };

      this.audio = audio;
      this.isPlaying = true;
      this.audioState.setPlaying(this.audioSource);

      await audio.play();
    } catch (err) {
      console.error('Soundboard lejátszási hiba:', err);
      this.isPlaying = false;
    }
  }

  stopSlot(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }

    this.isPlaying = false;
    this.audioState.stop(this.audioSource);
  }

  setVolume(value: number): void {
    this.volume = value;

    if (this.audio && !this.isMuted) {
      this.audio.volume = value;
    }
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;

    if (this.isMuted) {
      this.previousVolume = this.volume;

      if (this.audio) {
        this.audio.volume = 0;
      }
    } else {
      if (this.audio) {
        this.audio.volume = this.volume || this.previousVolume || 1;
      }
    }
  }

 async loadSfxFiles(forceReload = false): Promise<void> {
  if (SoundboardSharedService.sfxLoaded && !forceReload) {
    this.allSfx = [...SoundboardSharedService.cachedSfx];
    this.updateFiltered();
    return;
  }

  if (SoundboardSharedService.sfxLoadingPromise && !forceReload) {
    await SoundboardSharedService.sfxLoadingPromise;
    this.allSfx = [...SoundboardSharedService.cachedSfx];
    this.updateFiltered();
    return;
  }

  SoundboardSharedService.sfxLoadingPromise = this.loadSfxFilesInternal();

  try {
    await SoundboardSharedService.sfxLoadingPromise;
  } finally {
    SoundboardSharedService.sfxLoadingPromise = null;
  }
}
private async loadSfxFilesInternal(): Promise<void> {
  this.allSfx = [];

  for (const folder of ['sfx', 'shorts']) {
    const listRef = ref(storage, folder);
    const res = await listAll(listRef);

    for (const item of res.items) {
      const url = await getDownloadURL(item);
      const title = item.name.replace(/\.(mp3|wav|ogg|m4a)$/i, '');
      const path = item.fullPath;

      this.allSfx.push({
        title,
        url,
        path,
        duration: 0
      });
    }
  }

  this.allSfx.sort((a, b) => a.title.localeCompare(b.title));

  SoundboardSharedService.cachedSfx = [...this.allSfx];
  SoundboardSharedService.sfxLoaded = true;

  this.updateFiltered();
}
async ensureLoaded(): Promise<void> {
  await this.loadBoards();
  await this.loadSfxFiles();
}

async refreshAll(forceReload = false): Promise<void> {
  await this.loadBoards(forceReload);
  await this.loadSfxFiles(forceReload);
}

clearCache(): void {
  SoundboardSharedService.boardsLoaded = false;
  SoundboardSharedService.sfxLoaded = false;
  SoundboardSharedService.boardsLoadingPromise = null;
  SoundboardSharedService.sfxLoadingPromise = null;
  SoundboardSharedService.cachedBoards = [];
  SoundboardSharedService.cachedSfx = [];
}
  updateFiltered(): void {
    const q = this.searchTerm.trim().toLowerCase();

    if (!q) {
      this.filteredSfx = [...this.allSfx];
      return;
    }

    this.filteredSfx = this.allSfx.filter(t =>
      t.title.toLowerCase().includes(q)
    );
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.updateFiltered();
  }

  async deleteSfx(track: SfxTrack): Promise<void> {
    if (track.path) {
      await deleteObject(ref(storage, track.path));
    }

    this.allSfx = this.allSfx.filter(x =>
      x.url !== track.url && x.path !== track.path
    );

    this.updateFiltered();
  }

  addLocalSfx(track: SfxTrack): void {
    this.allSfx.push(track);
    this.updateFiltered();
  }

  formatTime(seconds: number): string {
    if (!seconds || !isFinite(seconds)) return '0:00';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}