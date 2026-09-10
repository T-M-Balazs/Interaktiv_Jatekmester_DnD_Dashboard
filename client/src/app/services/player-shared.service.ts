import { Injectable } from '@angular/core';
import { auth, db, storage } from '../player/firebase-config';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { AudioStateService, AudioSource } from './audio-state.service';
import {
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';

export interface Track {
  title: string;
  url: string;
  path: string;
}

export interface Playlist {
  id: string;
  name: string;
  trackUrls: string[];
  ownerId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PlayerSharedService {
  private audioSource: AudioSource = 'player';
  private static tracksLoaded = false;
  private static playlistsLoaded = false;
  private static tracksLoadingPromise: Promise<Track[]> | null = null;
  private static playlistsLoadingPromise: Promise<Playlist[]> | null = null;

  private static cachedTracks: Track[] = [];
  private static cachedPlaylists: Playlist[] = [
    { id: 'all', name: 'Összes zene', trackUrls: [] }
  ];
  private static cachedPlaylistsOwnerId: string | null = null;

  allTracks: Track[] = [];
  filteredTracks: Track[] = [];
  playlist: Track[] = [];
  playlists: Playlist[] = [{ id: 'all', name: 'Összes zene', trackUrls: [] }];

  selectedPlaylistId = 'all';
  currentTrackIndex = -1;
  isPlaying = false;
  currentTime = 0;
  duration = 0;
  volume = 1;
  searchTerm = '';
  isShuffleEnabled = false;
  isRepeatEnabled = false;
  private selectionInitialized = false;

  private audio = new Audio();
  private readonly audioInstanceId = `player-${Math.random().toString(36).slice(2)}`;

 constructor(private audioState: AudioStateService) {
    this.audio.preload = 'metadata';
    this.audio.volume = this.volume;

    this.audio.addEventListener('loadedmetadata', () => {
      this.duration = this.audio.duration || 0;
    });

    this.audio.addEventListener('timeupdate', () => {
      this.currentTime = this.audio.currentTime || 0;
    });

    this.audio.addEventListener('ended', () => {
      if (this.isRepeatEnabled && this.playlist.length > 0) {
        this.playTrack(this.isShuffleEnabled ? this.getRandomTrackIndex() : 0);
        return;
      }

      if (this.isShuffleEnabled && this.playlist.length > 1) {
        this.playTrack(this.getRandomTrackIndex());
        return;
      }

      if (this.currentTrackIndex < this.playlist.length - 1) {
        this.playTrack(this.currentTrackIndex + 1);
        return;
      }

      this.isPlaying = false;
      this.audioState.stopForInstance(this.audioSource, this.audioInstanceId);
    });
  }
setAudioSource(source: AudioSource): void {
  this.audioSource = source;
}
  get currentTrack(): Track | null {
    if (this.currentTrackIndex < 0 || this.currentTrackIndex >= this.playlist.length) {
      return null;
    }

    return this.playlist[this.currentTrackIndex];
  }

  cleanTitle(title: string): string {
    if (!title) return '';

    return title
      .replace(/^\d+_/, '')
      .replace(/_/g, ' ')
      .replace(/\.[^/.]+$/, '');
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  async ensureLoaded(): Promise<void> {
    await this.loadTracks();
    await this.loadPlaylists();

    if (!this.selectionInitialized) {
      this.selectPlaylist(this.selectedPlaylistId);
    }
  }

  async refreshAll(forceReload = false): Promise<void> {
    await this.loadTracks(forceReload);
    await this.loadPlaylists(forceReload);
    this.selectPlaylist(this.selectedPlaylistId);
  }

  async loadTracks(forceReload = false): Promise<Track[]> {
    if (PlayerSharedService.tracksLoaded && !forceReload) {
      this.allTracks = [...PlayerSharedService.cachedTracks];
      this.updateFilteredTracks();
      return this.allTracks;
    }

    if (PlayerSharedService.tracksLoadingPromise && !forceReload) {
      const tracks = await PlayerSharedService.tracksLoadingPromise;
      this.allTracks = [...tracks];
      this.updateFilteredTracks();
      return this.allTracks;
    }

    PlayerSharedService.tracksLoadingPromise = this.loadTracksFromStorage();

    try {
      const tracks = await PlayerSharedService.tracksLoadingPromise;

      PlayerSharedService.cachedTracks = tracks;
      PlayerSharedService.tracksLoaded = true;

      this.allTracks = [...tracks];
      this.updateFilteredTracks();

      return this.allTracks;
    } finally {
      PlayerSharedService.tracksLoadingPromise = null;
    }
  }

  private async loadTracksFromStorage(): Promise<Track[]> {
    const audioFolderRef = ref(storage, 'audio');
    const res = await listAll(audioFolderRef);

    const trackPromises = res.items.map(async item => {
      const url = await getDownloadURL(item);

      return {
        title: item.name,
        url,
        path: item.fullPath
      } as Track;
    });

    const tracks = await Promise.all(trackPromises);

    tracks.sort((a, b) =>
      this.cleanTitle(a.title).localeCompare(this.cleanTitle(b.title))
    );

    return tracks;
  }

  async loadPlaylists(forceReload = false): Promise<Playlist[]> {
    const ownerId = auth.currentUser?.uid;

    if (!ownerId) {
      this.playlists = [{ id: 'all', name: 'Összes zene', trackUrls: [] }];
      return this.playlists;
    }

    if (
      PlayerSharedService.playlistsLoaded &&
      PlayerSharedService.cachedPlaylistsOwnerId === ownerId &&
      !forceReload
    ) {
      this.playlists = [...PlayerSharedService.cachedPlaylists];
      return this.playlists;
    }

    if (PlayerSharedService.playlistsLoadingPromise && !forceReload) {
      const playlists = await PlayerSharedService.playlistsLoadingPromise;
      this.playlists = [...playlists];
      return this.playlists;
    }

    PlayerSharedService.playlistsLoadingPromise = this.loadPlaylistsFromFirestore();

    try {
      const playlists = await PlayerSharedService.playlistsLoadingPromise;

      PlayerSharedService.cachedPlaylists = playlists;
      PlayerSharedService.cachedPlaylistsOwnerId = ownerId;
      PlayerSharedService.playlistsLoaded = true;

      this.playlists = [...playlists];

      return this.playlists;
    } finally {
      PlayerSharedService.playlistsLoadingPromise = null;
    }
  }

  private async loadPlaylistsFromFirestore(): Promise<Playlist[]> {
    const ownerId = auth.currentUser?.uid;

    if (!ownerId) {
      return [{ id: 'all', name: 'Összes zene', trackUrls: [] }];
    }

    const q = query(
      collection(db, 'playlists'),
      where('ownerId', '==', ownerId)
    );
    const snap = await getDocs(q);

    const loadedPlaylists: Playlist[] = snap.docs.map(d => {
      const data = d.data();

      return {
        id: d.id,
        name: typeof data['name'] === 'string' ? data['name'] : 'Névtelen lista',
        trackUrls: Array.isArray(data['trackUrls']) ? data['trackUrls'] : [],
        ownerId: typeof data['ownerId'] === 'string' ? data['ownerId'] : undefined
      };
    });

    loadedPlaylists.sort((a, b) => a.name.localeCompare(b.name));

    return [
      { id: 'all', name: 'Összes zene', trackUrls: [] },
      ...loadedPlaylists
    ];
  }

  clearCache(): void {
    PlayerSharedService.tracksLoaded = false;
    PlayerSharedService.playlistsLoaded = false;
    PlayerSharedService.tracksLoadingPromise = null;
    PlayerSharedService.playlistsLoadingPromise = null;
    PlayerSharedService.cachedTracks = [];
    PlayerSharedService.cachedPlaylists = [
      { id: 'all', name: 'Összes zene', trackUrls: [] }
    ];
    PlayerSharedService.cachedPlaylistsOwnerId = null;
    this.selectionInitialized = false;
  }

  updateFilteredTracks(): void {
    const normalizedTerm = this.searchTerm.trim().toLowerCase();

    this.filteredTracks = this.allTracks.filter(t =>
      this.cleanTitle(t.title).toLowerCase().includes(normalizedTerm)
    );
  }

  setSearchTerm(term: string): void {
    this.searchTerm = term;
    this.updateFilteredTracks();
  }

  getSelectedPlaylistName(): string {
    return this.playlists.find(playlist => playlist.id === this.selectedPlaylistId)?.name
      || 'Összes zene';
  }

  selectPlaylist(id: string): void {
    this.selectedPlaylistId = id;
    this.selectionInitialized = true;

    if (id === 'all') {
      this.playlist = [...this.allTracks];
    } else {
      const pl = this.playlists.find(p => p.id === id);
      const trackUrls = pl?.trackUrls ?? [];
      this.playlist = this.allTracks.filter(t => trackUrls.includes(t.url));
    }

    this.resetPlayerState();
  }

  resetPlayerState(stopAudio = true): void {
    this.isPlaying = false;
    this.audioState.stopForInstance(this.audioSource, this.audioInstanceId);
    this.currentTime = 0;
    this.duration = 0;
    this.currentTrackIndex = -1;

    if (stopAudio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.src = '';
    }
  }

  async playTrack(index: number): Promise<void> {
    if (index < 0 || index >= this.playlist.length) return;

    const track = this.playlist[index];

    this.currentTrackIndex = index;
    this.currentTime = 0;
    this.duration = 0;

    if (this.audio.src !== track.url) {
      this.audio.src = track.url;
      this.audio.load();
    }

    try {
      await this.audio.play();
      this.isPlaying = true;
      this.audioState.setPlayingForInstance(this.audioSource, this.audioInstanceId);
    } catch (err) {
      console.error('Track lejátszása sikertelen:', err);
      this.isPlaying = false;
    }
  }

  async togglePlay(): Promise<void> {
    if (!this.audio.src) {
      if (this.playlist.length > 0) {
        await this.playTrack(0);
      }
      return;
    }

    if (this.audio.paused) {
      try {
        await this.audio.play();
        this.isPlaying = true;
        this.audioState.setPlayingForInstance(this.audioSource, this.audioInstanceId);
      } catch (err) {
        console.error('Lejátszás indítása sikertelen:', err);
        this.isPlaying = false;
      }
    } else {
      this.audio.pause();
      this.isPlaying = false;
      this.audioState.stopForInstance(this.audioSource, this.audioInstanceId);
    }
  }

  nextTrack(): void {
    if (this.playlist.length === 0) return;

    if (this.isShuffleEnabled) {
      this.playTrack(this.getRandomTrackIndex());
      return;
    }

    if (this.currentTrackIndex < this.playlist.length - 1) {
      this.playTrack(this.currentTrackIndex + 1);
    }
  }

  prevTrack(): void {
    if (this.currentTrackIndex > 0) {
      this.playTrack(this.currentTrackIndex - 1);
    } else {
      this.audio.currentTime = 0;
      this.currentTime = 0;
    }
  }

  toggleShuffle(): void {
    this.isShuffleEnabled = !this.isShuffleEnabled;
    if (this.isShuffleEnabled) {
      this.isRepeatEnabled = false;
    }
  }

  toggleRepeat(): void {
    this.isRepeatEnabled = !this.isRepeatEnabled;
    if (this.isRepeatEnabled) {
      this.isShuffleEnabled = false;
    }
  }

  private getRandomTrackIndex(): number {
    if (this.playlist.length <= 1) return 0;

    let nextIndex = this.currentTrackIndex;
    while (nextIndex === this.currentTrackIndex) {
      nextIndex = Math.floor(Math.random() * this.playlist.length);
    }
    return nextIndex;
  }

  seek(value: number): void {
    this.audio.currentTime = value;
    this.currentTime = value;
  }

  setVolume(value: number): void {
    this.volume = value;
    this.audio.volume = value;
  }

  getAudio(): HTMLAudioElement {
    return this.audio;
  }
}