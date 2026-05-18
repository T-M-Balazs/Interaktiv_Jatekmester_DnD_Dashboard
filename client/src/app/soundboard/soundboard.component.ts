
import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';

import { storage, db } from '../player/firebase-config';

import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';

import {
  SoundboardSharedService,
  SfxTrack,
  Soundboard
} from '../services/soundboard-shared.service';

@Component({
  selector: 'app-soundboard',

  templateUrl: './soundboard.component.html',
  styleUrls: ['./soundboard.component.css']
})
export class SoundboardComponent implements AfterViewInit {
  @ViewChild('player') playerRef!: ElementRef<HTMLAudioElement>;

  isAddingBoard = false;
  newBoardName = '';

  originalFile: File | null = null;
  tempObjectUrl: string | null = null;

  audioCtx: AudioContext | null = null;
  audioBuffer: AudioBuffer | null = null;

  duration = 0;

  startSec = 0;
  endSec = 0;

  startMinInput = '';
  startSecInput = '';
  endMinInput = '';
  endSecInput = '';

  seekMinInput = '';
  seekSecInput = '';

  clipName = '';
  cutMessage = '';
  cutError = '';
  isCutting = false;

  private isCutterPlaying = false;

  constructor(public soundboard: SoundboardSharedService) {}

  get player(): HTMLAudioElement {
    return this.playerRef.nativeElement;
  }

  get boards() {
    return this.soundboard.boards;
  }

  get selectedBoardId() {
    return this.soundboard.selectedBoardId;
  }

  get selectedSlotIndex() {
    return this.soundboard.selectedSlotIndex;
  }

  get selectedBoard(): Soundboard | null {
    return this.soundboard.selectedBoard;
  }

  get allSfx() {
    return this.soundboard.allSfx;
  }

  get filteredSfx() {
    return this.soundboard.filteredSfx;
  }

  get searchTerm() {
    return this.soundboard.searchTerm;
  }

  set searchTerm(value: string) {
    this.soundboard.searchTerm = value;
  }

  get volume() {
    return this.soundboard.volume;
  }

  get isPlaying() {
    return this.soundboard.isPlaying || this.isCutterPlaying;
  }

  get currentPos() {
    return this.playerRef?.nativeElement?.currentTime || 0;
  }

  set currentPos(value: number) {
    if (this.playerRef?.nativeElement) {
      this.playerRef.nativeElement.currentTime = value;
    }
  }

  get selectedLength(): number {
    return Math.max(0, this.endSec - this.startSec);
  }

 async ngAfterViewInit() {
  this.soundboard.setAudioSource('soundboard');
  await this.soundboard.ensureLoaded();

  if (this.soundboard.boards.length && !this.soundboard.selectedBoardId) {
    this.soundboard.selectBoard(this.soundboard.boards[0].id);
  }
}

  toggleAddBoard() {
    this.isAddingBoard = !this.isAddingBoard;
  }

  async createBoard() {
    const created = await this.soundboard.createBoard(this.newBoardName);

    if (!created) return;

    this.newBoardName = '';
    this.isAddingBoard = false;
  }

  selectBoard(id: string) {
    this.soundboard.selectBoard(id);
  }

  async deleteBoard(id: string) {
    await this.soundboard.deleteBoard(id);
  }

  selectSlot(index: number) {
    this.soundboard.selectSlot(index);
  }

  getSlotName(board: Soundboard, index: number) {
    return this.soundboard.getSlotName(board, index);
  }

  async assignToSlot(track: SfxTrack) {
    await this.soundboard.assignToSlot(track);
  }

  async clearSlot() {
    await this.soundboard.clearSlot();
  }

  async playSlot(index: number) {
    this.stopCutterPreview();
    await this.soundboard.playSlot(index);
  }

  stopSlot() {
    this.soundboard.stopSlot();
  }

  onSearch(term: string) {
    this.soundboard.onSearch(term);
  }

  async deleteSfx(track: SfxTrack) {
    await this.soundboard.deleteSfx(track);
  }

  formatTime(seconds: number): string {
    return this.soundboard.formatTime(seconds);
  }

  setVolume(value: number) {
    this.soundboard.setVolume(value);

    if (this.playerRef?.nativeElement) {
      this.player.volume = value;
    }
  }

  sanitizeTimeInput(value: string): string {
    return (value || '').replace(/\D/g, '').slice(0, 2);
  }

  private toTwoDigits(value: number): string {
    return Math.floor(value).toString().padStart(2, '0');
  }

  private syncSeekFields(value: number) {
    this.seekMinInput = this.toTwoDigits(Math.floor(value / 60));
    this.seekSecInput = this.toTwoDigits(Math.floor(value % 60));
  }

  private syncStartFields() {
    this.startMinInput = this.toTwoDigits(Math.floor(this.startSec / 60));
    this.startSecInput = this.toTwoDigits(Math.floor(this.startSec % 60));
  }

  private syncEndFields() {
    this.endMinInput = this.toTwoDigits(Math.floor(this.endSec / 60));
    this.endSecInput = this.toTwoDigits(Math.floor(this.endSec % 60));
  }

  private bindTimeUpdate() {
    this.player.ontimeupdate = () => {
      const pos = this.player.currentTime;
      this.syncSeekFields(pos);

      if (pos >= this.endSec) {
        this.player.pause();
        this.player.currentTime = this.startSec;
        this.syncSeekFields(this.startSec);
        this.isCutterPlaying = false;
      }
    };

    this.player.onended = () => {
      this.isCutterPlaying = false;
    };
  }

  togglePlay() {
    if (!this.tempObjectUrl) return;

    this.soundboard.stopSlot();

    if (this.isCutterPlaying) {
      this.player.pause();
      this.isCutterPlaying = false;
      return;
    }

    let pos = this.player.currentTime;

    if (pos < this.startSec || pos >= this.endSec) {
      pos = this.startSec;
    }

    this.player.currentTime = pos;
    this.player.volume = this.volume;
    this.player.play();

    this.isCutterPlaying = true;

    this.bindTimeUpdate();
  }

  private stopCutterPreview() {
    if (!this.playerRef?.nativeElement) return;

    this.player.pause();
    this.player.currentTime = this.startSec;
    this.isCutterPlaying = false;
  }

  onSeekChange(value: number) {
    const safeValue = Math.max(0, Math.min(value, this.duration));

    this.player.currentTime = safeValue;
    this.syncSeekFields(safeValue);
  }

  applySeekTyped() {
    let min = parseInt(this.seekMinInput, 10);
    let sec = parseInt(this.seekSecInput, 10);

    if (isNaN(min)) min = 0;
    if (isNaN(sec)) sec = 0;
    if (sec > 59) sec = 59;

    const total = Math.max(0, Math.min(min * 60 + sec, this.duration));

    this.player.currentTime = total;
    this.syncSeekFields(total);
  }

  async onTempFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files || !input.files.length) return;

    this.originalFile = input.files[0];
    this.cutMessage = '';
    this.cutError = '';

    if (this.tempObjectUrl) {
      URL.revokeObjectURL(this.tempObjectUrl);
    }

    this.tempObjectUrl = URL.createObjectURL(this.originalFile);

    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }

    const arrayBuffer = await this.originalFile.arrayBuffer();
    this.audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);

    this.duration = this.audioBuffer.duration;

    this.startSec = 0;
    this.endSec = this.duration;

    this.startMinInput = '';
    this.startSecInput = '';
    this.endMinInput = '';
    this.endSecInput = '';

    this.seekMinInput = '';
    this.seekSecInput = '';

    this.player.src = this.tempObjectUrl;
    this.player.volume = this.volume;
    this.player.currentTime = 0;

    this.updateLengthError();
    this.bindTimeUpdate();
  }

  applyStartTyped() {
    let min = parseInt(this.startMinInput, 10);
    let sec = parseInt(this.startSecInput, 10);

    if (isNaN(min)) min = 0;
    if (isNaN(sec)) sec = 0;
    if (sec > 59) sec = 59;

    let total = min * 60 + sec;

    total = Math.max(0, total);
    total = Math.min(total, this.endSec);

    this.startSec = total;
    this.syncStartFields();

    if (this.player.currentTime < this.startSec) {
      this.player.currentTime = this.startSec;
      this.syncSeekFields(this.startSec);
    }

    this.updateLengthError();
  }

  applyEndTyped() {
    let min = parseInt(this.endMinInput, 10);
    let sec = parseInt(this.endSecInput, 10);

    if (isNaN(min)) min = 0;
    if (isNaN(sec)) sec = 0;
    if (sec > 59) sec = 59;

    let total = min * 60 + sec;

    total = Math.min(total, this.duration);
    total = Math.max(total, this.startSec);

    this.endSec = total;
    this.syncEndFields();

    if (this.player.currentTime > this.endSec) {
      this.player.currentTime = this.endSec;
      this.syncSeekFields(this.endSec);
    }

    this.updateLengthError();
  }

  private updateLengthError() {
    if (this.selectedLength > 5) {
      this.cutError =
        'Maximum 5 másodperc választható, jelenleg ' +
        this.selectedLength.toFixed(2) +
        's.';
    } else {
      this.cutError = '';
    }
  }

  audioBufferToWav(buffer: AudioBuffer) {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const wavBuffer = new ArrayBuffer(length);
    const view = new DataView(wavBuffer);
    const channels = [];
    const sampleRate = buffer.sampleRate;

    let offset = 0;
    let pos = 0;

    const writeString = (str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(pos++, str.charCodeAt(i));
      }
    };

    writeString('RIFF');
    view.setUint32(pos, 36 + buffer.length * 2 * numOfChan, true);
    pos += 4;

    writeString('WAVEfmt ');
    view.setUint32(pos, 16, true);
    pos += 4;

    view.setUint16(pos, 1, true);
    pos += 2;

    view.setUint16(pos, numOfChan, true);
    pos += 2;

    view.setUint32(pos, sampleRate, true);
    pos += 4;

    view.setUint32(pos, sampleRate * 2 * numOfChan, true);
    pos += 4;

    view.setUint16(pos, numOfChan * 2, true);
    pos += 2;

    view.setUint16(pos, 16, true);
    pos += 2;

    writeString('data');
    view.setUint32(pos, buffer.length * 2 * numOfChan, true);
    pos += 4;

    for (let i = 0; i < numOfChan; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (offset < buffer.length) {
      for (let i = 0; i < numOfChan; i++) {
        const sample = Math.max(-1, Math.min(1, channels[i][offset]));

        view.setInt16(
          pos,
          sample < 0 ? sample * 0x8000 : sample * 0x7fff,
          true
        );

        pos += 2;
      }

      offset++;
    }

    return wavBuffer;
  }

  selectAll(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    input.select();
  }

  async cutAndUpload() {
    if (!this.originalFile || !this.audioBuffer) {
      this.cutError = 'Nincs hangfájl betöltve.';
      return;
    }

    if (this.selectedLength <= 0) {
      this.cutError = 'A kijelölt hossz 0.';
      return;
    }

    if (this.selectedLength > 5) {
      this.cutError = 'Maximum 5 másodperc vágható!';
      return;
    }

    this.isCutting = true;
    this.cutError = '';
    this.cutMessage = '';

    try {
      const sampleRate = this.audioBuffer.sampleRate;
      const frames = Math.floor(this.selectedLength * sampleRate);

      const offline = new OfflineAudioContext(
        this.audioBuffer.numberOfChannels,
        frames,
        sampleRate
      );

      const src = offline.createBufferSource();

      src.buffer = this.audioBuffer;
      src.connect(offline.destination);
      src.start(0, this.startSec, this.selectedLength);

      const rendered = await offline.startRendering();

      const wav = this.audioBufferToWav(rendered);
      const blob = new Blob([wav], { type: 'audio/wav' });

      const nameBase = this.clipName.trim() || 'short_clip';
      const filePath = `shorts/${Date.now()}_${nameBase}.wav`;

      const fileRef = ref(storage, filePath);

      await uploadBytes(fileRef, blob);

      const url = await getDownloadURL(fileRef);

      const newClip: SfxTrack = {
        title: nameBase,
        url,
        path: filePath,
        duration: this.selectedLength
      };

      this.soundboard.addLocalSfx(newClip);

      this.cutMessage = 'Sikeresen feltöltve!';
      this.clipName = '';
    } catch (err) {
      console.error(err);
      this.cutError = 'Vágási hiba.';
    }

    this.isCutting = false;
  }
}