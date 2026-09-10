import { Component, OnInit } from '@angular/core';
import { UploadService } from '../services/upload.service';
import { PlayerSharedService, Track } from '../services/player-shared.service';

import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { auth, db, storage } from './firebase-config';
import { deleteObject, ref } from 'firebase/storage';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.css']
})
export class PlayerComponent implements OnInit {
  isAddingPlaylist = false;
  newPlaylistName = '';

  isUploading = false;
  uploadMessage = '';
  uploadError = '';
  selectedFile: File | null = null;

  pendingTrackUrlForPlaylist: string | null = null;

  constructor(
    public player: PlayerSharedService,
    private uploadService: UploadService
  ) {}

  async ngOnInit(): Promise<void> {
  this.player.setAudioSource('player');
  await this.player.ensureLoaded();
}

  toggleAddPlaylist(): void {
    this.isAddingPlaylist = !this.isAddingPlaylist;

    if (!this.isAddingPlaylist) {
      this.newPlaylistName = '';
    }
  }

  async createPlaylist(): Promise<void> {
    const trimmedName = this.newPlaylistName.trim();
    if (!trimmedName) return;

    try {
      const ownerId = auth.currentUser?.uid;
      if (!ownerId) return;

      await addDoc(collection(db, 'playlists'), {
        name: trimmedName,
        trackUrls: [],
        ownerId,
        createdAt: serverTimestamp()
      });

      this.newPlaylistName = '';
      this.isAddingPlaylist = false;

      await this.player.loadPlaylists(true);
      this.player.selectPlaylist(this.player.selectedPlaylistId);
    } catch (err) {
      console.error('Hiba a playlist létrehozásakor:', err);
    }
  }

  async deletePlaylist(id: string): Promise<void> {
    if (id === 'all') return;
    const playlist = this.player.playlists.find(item => item.id === id);
    if (!playlist || playlist.ownerId !== auth.currentUser?.uid) return;
    if (!confirm('Törlöd ezt a listát?')) return;

    try {
      await deleteDoc(doc(db, 'playlists', id));

      await this.player.loadPlaylists(true);
      this.player.selectPlaylist('all');
    } catch (err) {
      console.error('Hiba a playlist törlésekor:', err);
    }
  }

  onSearchChange(term: string): void {
    this.player.setSearchTerm(term);
  }

  async playFromLibrary(index: number): Promise<void> {
    if (index < 0 || index >= this.player.filteredTracks.length) return;

    this.player.playlist = [...this.player.filteredTracks];
    this.player.currentTrackIndex = -1;

    await this.player.playTrack(index);
  }

  async onAddTrackToPlaylist(track: Track, playlistId: string): Promise<void> {
    if (!playlistId || playlistId === 'all') {
      this.pendingTrackUrlForPlaylist = null;
      return;
    }

    try {
      const playlistRef = doc(db, 'playlists', playlistId);
      const playlist = this.player.playlists.find(item => item.id === playlistId);
      if (!playlist || playlist.ownerId !== auth.currentUser?.uid) return;

      await updateDoc(playlistRef, {
        trackUrls: arrayUnion(track.url)
      });

      this.pendingTrackUrlForPlaylist = null;

      await this.player.loadPlaylists(true);

      if (this.player.selectedPlaylistId === playlistId) {
        this.player.selectPlaylist(playlistId);
      }
    } catch (err) {
      console.error('Hiba a szám playlisthez adásakor:', err);
    }
  }

  async removeTrackFromPlaylist(track: Track): Promise<void> {
    if (this.player.selectedPlaylistId === 'all') return;

    try {
      const playlistRef = doc(db, 'playlists', this.player.selectedPlaylistId);
      const playlist = this.player.playlists.find(
        item => item.id === this.player.selectedPlaylistId
      );
      if (!playlist || playlist.ownerId !== auth.currentUser?.uid) return;

      await updateDoc(playlistRef, {
        trackUrls: arrayRemove(track.url)
      });

      const removedCurrent =
        this.player.currentTrack &&
        this.player.currentTrack.url === track.url;

      await this.player.loadPlaylists(true);
      this.player.selectPlaylist(this.player.selectedPlaylistId);

      if (removedCurrent) {
        this.player.resetPlayerState();
      }
    } catch (err) {
      console.error('Hiba a szám eltávolításakor:', err);
    }
  }

  togglePlaylistMenu(track: Track): void {
    this.pendingTrackUrlForPlaylist =
      this.pendingTrackUrlForPlaylist === track.url ? null : track.url;
  }

  async deleteTrack(track: Track): Promise<void> {
    const ownerId = auth.currentUser?.uid;

    if (!ownerId || !confirm(`Biztosan törlöd ezt a zenét?\n\n${this.player.cleanTitle(track.title)}`)) {
      return;
    }

    try {
      await deleteObject(ref(storage, track.path));

      const ownPlaylists = this.player.playlists.filter(
        playlist => playlist.id !== 'all' && playlist.ownerId === ownerId
      );

      await Promise.all(
        ownPlaylists
          .filter(playlist => playlist.trackUrls.includes(track.url))
          .map(playlist =>
            updateDoc(doc(db, 'playlists', playlist.id), {
              trackUrls: arrayRemove(track.url)
            })
          )
      );

      this.player.clearCache();
      await this.player.refreshAll(true);
      this.pendingTrackUrlForPlaylist = null;
    } catch (err) {
      console.error('Hiba a zene törlésekor:', err);
      this.uploadError = 'A zene törlése sikertelen.';
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.selectedFile = input.files?.[0] ?? null;
    this.uploadMessage = '';
    this.uploadError = '';
  }

  async uploadSelectedFile(): Promise<void> {
    if (!this.selectedFile || this.isUploading) return;

    this.isUploading = true;
    this.uploadMessage = '';
    this.uploadError = '';

    this.uploadService.upload(this.selectedFile, 'audio').subscribe({
      next: async () => {
        this.player.clearCache();
        await this.player.refreshAll(true);

        this.isUploading = false;
        this.uploadMessage = 'Feltöltés sikeres.';
        this.selectedFile = null;
      },
      error: (err: any) => {
        console.error('Feltöltési hiba:', err);

        this.isUploading = false;
        this.uploadError = 'A feltöltés sikertelen.';
      }
    });
  }
}