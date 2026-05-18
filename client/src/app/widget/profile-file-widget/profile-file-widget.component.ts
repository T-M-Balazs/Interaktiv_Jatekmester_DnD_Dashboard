import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { auth, db } from '../../player/firebase-config';

import {
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';

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
  selector: 'app-profile-file-widget',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './profile-file-widget.component.html',
  styleUrls: ['./profile-file-widget.component.css']
})
export class ProfileFileWidgetComponent implements OnInit, OnDestroy {
  constructor(private sanitizer: DomSanitizer) {}
  currentUser: User | null = null;
  safePdfUrl: SafeResourceUrl | null = null;
  searchText = '';
  isLoading = false;
  openedFile: UserFile | null = null;
  userFiles: UserFile[] = [];

  private authUnsubscribe: Unsubscribe | null = null;

  ngOnInit(): void {
    this.authUnsubscribe = onAuthStateChanged(auth, async user => {
      this.currentUser = user;

      if (!user) {
        this.userFiles = [];
        return;
      }

      await this.loadUserFiles();
    });
  }

  ngOnDestroy(): void {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }
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

  async loadUserFiles(): Promise<void> {
    const user = this.currentUser;

    if (!user) {
      this.userFiles = [];
      return;
    }

    try {
      this.isLoading = true;

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
    } catch (error) {
      console.error('Fájlok betöltési hiba:', error);
    } finally {
      this.isLoading = false;
    }
  }

 openFile(file: UserFile): void {
  this.openedFile = file;

  if (this.isPdf(file)) {
    this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(file.url);
  } else {
    this.safePdfUrl = null;
  }
}

  closeViewer(): void {
  this.openedFile = null;
  this.safePdfUrl = null;
}

  isPdf(file: UserFile | null): boolean {
    return !!file && file.type === 'application/pdf';
  }

  isImage(file: UserFile | null): boolean {
    return !!file && file.type.startsWith('image/');
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