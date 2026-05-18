import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { auth, db, storage } from '../player/firebase-config';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';

import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes
} from 'firebase/storage';

import {
  onAuthStateChanged,
  Unsubscribe,
  User
} from 'firebase/auth';

interface UserFile {
  id: string;
  ownerId: string;
  ownerEmail: string;
  name: string;
  nameLower: string;
  type: string;
  size: number;
  url: string;
  storagePath: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  currentUserName = '';
  currentUserEmail = '';

  selectedFiles: File[] = [];
  profileImageFile: File | null = null;

  profilePreviewUrl = '';
  currentProfilePhotoUrl = '';

  avatarScale = 1;
  avatarX = 50;
  avatarY = 50;

  uploadStatus = '';

  searchText = '';
  userFiles: UserFile[] = [];

  isLoadingProfile = false;
  isLoadingFiles = false;
  isUploading = false;
  isDeletingFileId: string | null = null;

  private authUnsubscribe: Unsubscribe | null = null;

  ngOnInit(): void {
    this.authUnsubscribe = onAuthStateChanged(auth, async user => {
      this.currentUser = user;

      if (!user) {
        this.currentUserName = '';
        this.currentUserEmail = '';
        this.currentProfilePhotoUrl = '';
        this.userFiles = [];
        this.uploadStatus = 'A profil használatához be kell jelentkezned.';
        return;
      }

      this.currentUserEmail = user.email || '';
      this.currentUserName = user.displayName || user.email || 'Felhasználó';

      await this.loadProfileData();
      await this.loadUserFiles();
    });
  }

  ngOnDestroy(): void {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }

    if (this.profilePreviewUrl) {
      URL.revokeObjectURL(this.profilePreviewUrl);
    }
  }

  get hasSelectedNewProfileImage(): boolean {
    return !!this.profilePreviewUrl && !!this.profileImageFile;
  }

  get filteredFiles(): UserFile[] {
    const text = this.searchText.trim().toLowerCase();

    if (!text) {
      return this.userFiles;
    }

    return this.userFiles.filter(file =>
      file.nameLower.includes(text)
    );
  }

  async loadProfileData(): Promise<void> {
    const user = this.currentUser;

    if (!user) {
      return;
    }

    try {
      this.isLoadingProfile = true;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        this.currentUserName = user.displayName || user.email || 'Felhasználó';
        this.currentUserEmail = user.email || '';
        this.currentProfilePhotoUrl = '';
        return;
      }

      const data = userSnap.data() as any;

      this.currentUserName =
        data.username ||
        data.displayName ||
        user.displayName ||
        user.email ||
        'Felhasználó';

      this.currentUserEmail =
        data.email ||
        user.email ||
        '';

      this.currentProfilePhotoUrl =
        data.profilePhotoUrl ||
        '';

      const settings = data.profilePhotoSettings;

      if (settings) {
        this.avatarScale = settings.scale ?? 1;
        this.avatarX = settings.x ?? 50;
        this.avatarY = settings.y ?? 50;
      }
    } catch (error: any) {
      console.error('Profiladat betöltési hiba:', error);
      this.uploadStatus = `Profiladat betöltési hiba: ${error?.code || error?.message || error}`;
    } finally {
      this.isLoadingProfile = false;
    }
  }

  onProfileImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.profileImageFile = input.files?.[0] || null;

    if (this.profilePreviewUrl) {
      URL.revokeObjectURL(this.profilePreviewUrl);
      this.profilePreviewUrl = '';
    }

    if (!this.profileImageFile) {
      return;
    }

    if (!this.profileImageFile.type.startsWith('image/')) {
      this.uploadStatus = 'Csak képfájlt lehet profilképnek kiválasztani.';
      this.profileImageFile = null;
      return;
    }

    this.profilePreviewUrl = URL.createObjectURL(this.profileImageFile);
    this.avatarScale = 1;
    this.avatarX = 50;
    this.avatarY = 50;
    this.uploadStatus = `Kiválasztott profilkép: ${this.profileImageFile.name}`;
  }

  resetAvatarSettings(): void {
    this.avatarScale = 1;
    this.avatarX = 50;
    this.avatarY = 50;
  }

  cancelProfileImageSelection(): void {
    this.profileImageFile = null;

    if (this.profilePreviewUrl) {
      URL.revokeObjectURL(this.profilePreviewUrl);
      this.profilePreviewUrl = '';
    }

    this.uploadStatus = '';
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFiles = Array.from(input.files || []);

    if (this.selectedFiles.length > 0) {
      this.uploadStatus = `${this.selectedFiles.length} fájl kiválasztva.`;
    }
  }

  async uploadProfileImage(): Promise<void> {
    const user = this.currentUser;

    if (!user) {
      this.uploadStatus = 'Nem vagy bejelentkezve.';
      return;
    }

    if (!this.profileImageFile) {
      this.uploadStatus = 'Nincs kiválasztott új profilkép.';
      return;
    }

    if (!this.profileImageFile.type.startsWith('image/')) {
      this.uploadStatus = 'Csak képfájlt lehet profilképnek feltölteni.';
      return;
    }

    if (this.isUploading) {
      return;
    }

    this.isUploading = true;

    try {
      this.uploadStatus = 'Profilkép feltöltése...';

      const extension = this.profileImageFile.name.split('.').pop() || 'jpg';
      const filePath = `profilepictures/${user.uid}.${extension}`;
      const fileRef = ref(storage, filePath);

      await uploadBytes(fileRef, this.profileImageFile);

      const url = await getDownloadURL(fileRef);

      await setDoc(
        doc(db, 'users', user.uid),
        {
          username: this.currentUserName,
          email: user.email || '',
          profilePhotoUrl: url,
          profilePhotoPath: filePath,
          profilePhotoSettings: {
            scale: this.avatarScale,
            x: this.avatarX,
            y: this.avatarY
          },
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      this.currentProfilePhotoUrl = url;
      this.profileImageFile = null;

      if (this.profilePreviewUrl) {
        URL.revokeObjectURL(this.profilePreviewUrl);
        this.profilePreviewUrl = '';
      }

      this.uploadStatus = 'Profilkép sikeresen mentve.';
    } catch (error: any) {
      console.error('Profilkép feltöltési hiba:', error);
      this.uploadStatus = `Profilkép feltöltési hiba: ${error?.code || error?.message || error}`;
    } finally {
      this.isUploading = false;
    }
  }

  async uploadFiles(): Promise<void> {
    const user = this.currentUser;

    if (!user) {
      this.uploadStatus = 'Fájlfeltöltéshez be kell jelentkezni.';
      return;
    }

    if (this.selectedFiles.length === 0) {
      this.uploadStatus = 'Nincs kiválasztott fájl.';
      return;
    }

    if (this.isUploading) {
      return;
    }

    this.isUploading = true;

    try {
      this.uploadStatus = 'Fájlok feltöltése...';

      let uploadedCount = 0;
      let skippedCount = 0;

      for (const file of this.selectedFiles) {
        const isAllowed =
          file.type === 'application/pdf' ||
          file.type.startsWith('image/');

        if (!isAllowed) {
          skippedCount++;
          continue;
        }

        const safeName = file.name
          .replace(/\s+/g, '_')
          .replace(/[^\w.\-áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/g, '_');

        const filePath = `userfiles/${user.uid}/${Date.now()}_${safeName}`;
        const fileRef = ref(storage, filePath);

        await uploadBytes(fileRef, file);

        const url = await getDownloadURL(fileRef);

        await addDoc(collection(db, 'userFiles'), {
          ownerId: user.uid,
          ownerEmail: user.email || '',
          name: file.name,
          nameLower: file.name.toLowerCase(),
          type: file.type,
          size: file.size,
          url,
          storagePath: filePath,
          createdAt: serverTimestamp()
        });

        uploadedCount++;
      }

      this.selectedFiles = [];

      await this.loadUserFiles();

      if (uploadedCount > 0 && skippedCount === 0) {
        this.uploadStatus = 'Fájlok sikeresen feltöltve.';
      } else if (uploadedCount > 0 && skippedCount > 0) {
        this.uploadStatus = `${uploadedCount} fájl feltöltve, ${skippedCount} fájl kihagyva. Csak PDF és kép tölthető fel.`;
      } else {
        this.uploadStatus = 'Nem lett feltöltve fájl. Csak PDF és kép tölthető fel.';
      }
    } catch (error: any) {
      console.error('Fájlfeltöltési hiba:', error);
      this.uploadStatus = `Feltöltési hiba: ${error?.code || error?.message || error}`;
    } finally {
      this.isUploading = false;
    }
  }

  async loadUserFiles(): Promise<void> {
    const user = this.currentUser;

    if (!user) {
      this.userFiles = [];
      return;
    }

    try {
      this.isLoadingFiles = true;

      const q = query(
        collection(db, 'userFiles'),
        where('ownerId', '==', user.uid)
      );

      const snap = await getDocs(q);

      this.userFiles = snap.docs.map(docSnap => {
        const data = docSnap.data() as any;

        return {
          id: docSnap.id,
          ownerId: data.ownerId || '',
          ownerEmail: data.ownerEmail || '',
          name: data.name || 'Névtelen fájl',
          nameLower: data.nameLower || String(data.name || '').toLowerCase(),
          type: data.type || '',
          size: data.size || 0,
          url: data.url || '',
          storagePath: data.storagePath || ''
        };
      });

      this.userFiles.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error: any) {
      console.error('Fájlok betöltési hiba:', error);
      this.uploadStatus = `Fájlok betöltési hiba: ${error?.code || error?.message || error}`;
    } finally {
      this.isLoadingFiles = false;
    }
  }

  openFile(file: UserFile): void {
    if (!file.url) {
      return;
    }

    window.open(file.url, '_blank');
  }

  async deleteFile(file: UserFile, event?: MouseEvent): Promise<void> {
    if (event) {
      event.stopPropagation();
    }

    const user = this.currentUser;

    if (!user) {
      this.uploadStatus = 'Törléshez be kell jelentkezni.';
      return;
    }

    if (file.ownerId !== user.uid) {
      this.uploadStatus = 'Ezt a fájlt nem törölheted.';
      return;
    }

    const confirmed = confirm(`Biztosan törlöd ezt a fájlt?\n\n${file.name}`);

    if (!confirmed) {
      return;
    }

    this.isDeletingFileId = file.id;

    try {
      await deleteDoc(doc(db, 'userFiles', file.id));

      if (file.storagePath) {
        try {
          await deleteObject(ref(storage, file.storagePath));
        } catch (storageError) {
          console.warn('A Storage fájl törlése nem sikerült, csak az adatbázis rekord törlődött:', storageError);
        }
      }

      this.userFiles = this.userFiles.filter(item => item.id !== file.id);
      this.uploadStatus = 'Fájl törölve.';
    } catch (error: any) {
      console.error('Fájl törlési hiba:', error);
      this.uploadStatus = `Fájl törlési hiba: ${error?.code || error?.message || error}`;
    } finally {
      this.isDeletingFileId = null;
    }
  }

  getFileIcon(file: UserFile): string {
    if (file.type === 'application/pdf') {
      return '📄';
    }

    if (file.type.startsWith('image/')) {
      return '🖼️';
    }

    return '📁';
  }

  formatFileSize(size: number): string {
    if (!size) {
      return '0 KB';
    }

    const kb = size / 1024;
    const mb = kb / 1024;

    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    }

    return `${kb.toFixed(1)} KB`;
  }
}