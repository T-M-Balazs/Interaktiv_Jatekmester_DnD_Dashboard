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

  showColorPicker = false;
  showIconPicker = false;
  activePicker: 'color' | 'icon' | null = null;
  activePickerSlotIndex: number | null = null;

  pickerDirection: 'up' | 'down' = 'up';
  pickerMaxHeight = 320;

  colorOptions = [
    { value: '#fbbf24', gradient: 'linear-gradient(135deg, #ffd166 0%, #ff9f1c 40%, #ff6b35 100%)' },
    { value: '#f59e0b', gradient: 'linear-gradient(135deg, #ffe29a 0%, #ffc857 38%, #ff8f00 100%)' },
    { value: '#f97316', gradient: 'linear-gradient(135deg, #ffd6a5 0%, #ffb26b 38%, #e76f51 100%)' },
    { value: '#ef4444', gradient: 'linear-gradient(135deg, #ff9f9f 0%, #ff6b6b 45%, #d7263d 100%)' },
    { value: '#fb7185', gradient: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 35%, #fb7185 100%)' },
    { value: '#ec4899', gradient: 'linear-gradient(135deg, #ffb3c6 0%, #ff7aa2 45%, #c9184a 100%)' },
    { value: '#f472b6', gradient: 'linear-gradient(135deg, #f5d0fe 0%, #f9a8d4 38%, #ec4899 100%)' },
    { value: '#8b5cf6', gradient: 'linear-gradient(135deg, #f9d5ff 0%, #d8b4fe 42%, #8b5cf6 100%)' },
    { value: '#7c3aed', gradient: 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 38%, #7c3aed 100%)' },
    { value: '#6d28d9', gradient: 'linear-gradient(135deg, #ede9fe 0%, #c4b5fd 38%, #6d28d9 100%)' },
    { value: '#4f46e5', gradient: 'linear-gradient(135deg, #dfe9ff 0%, #a5b4fc 37%, #4f46e5 100%)' },
    { value: '#3b82f6', gradient: 'linear-gradient(135deg, #bae6fd 0%, #60a5fa 38%, #2563eb 100%)' },
    { value: '#2563eb', gradient: 'linear-gradient(135deg, #bfdbfe 0%, #93c5fd 38%, #1d4ed8 100%)' },
    { value: '#0284c7', gradient: 'linear-gradient(135deg, #e0f2fe 0%, #7dd3fc 38%, #0284c7 100%)' },
    { value: '#38bdf8', gradient: 'linear-gradient(135deg, #dbf4ff 0%, #a5d8ff 38%, #38bdf8 100%)' },
    { value: '#10b981', gradient: 'linear-gradient(135deg, #a7f3d0 0%, #4ade80 38%, #0f766e 100%)' },
    { value: '#14b8a6', gradient: 'linear-gradient(135deg, #99f6e4 0%, #2dd4bf 40%, #0f766e 100%)' },
    { value: '#22c55e', gradient: 'linear-gradient(135deg, #c7f9cc 0%, #7ae582 38%, #2e8b57 100%)' },
    { value: '#16a34a', gradient: 'linear-gradient(135deg, #dcfce7 0%, #86efac 38%, #16a34a 100%)' },
    { value: '#84cc16', gradient: 'linear-gradient(135deg, #ecfccb 0%, #bef264 40%, #4d7c0f 100%)' },
    { value: '#a3a3a3', gradient: 'linear-gradient(135deg, #f5f5f5 0%, #d4d4d4 35%, #525252 100%)' },
    { value: '#6b7280', gradient: 'linear-gradient(135deg, #d4d4d8 0%, #a1a1aa 40%, #3f3f46 100%)' },
    { value: '#475569', gradient: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 38%, #475569 100%)' },
    { value: '#f5f5f4', gradient: 'linear-gradient(135deg, #ffffff 0%, #e7e5e4 36%, #a8a29e 100%)' }
  ];

  iconOptions = [
    'music_note',
    'play_arrow',
    'pause',
    'volume_up',
    'bolt',
    'star',
    'favorite',
    'emoji_emotions',
    'warning',
    'flash_on',
    'whatshot',
    'swords',
    'nightlight',
    'local_fire_department',
    'forest',
    'casino',
    'campaign',
    'auto_awesome'
  ];

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

  normalizeColorValue(color: string | null | undefined): string {
    if (!color) return '#ffd700';

    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color)
      ? color
      : '#ffd700';
  }

  getSelectedSlotColor(): string {
    const board = this.selectedBoard;

    if (!board || this.selectedSlotIndex === null) {
      return '#ffd700';
    }

    return this.normalizeColorValue(
      board.slots[this.selectedSlotIndex]?.color
    );
  }

  getSelectedSlotIcon(): string {
    const board = this.selectedBoard;

    if (!board || this.selectedSlotIndex === null) {
      return 'music_note';
    }

    return board.slots[this.selectedSlotIndex]?.icon || 'music_note';
  }

  toggleColorPicker(
    slotIndex: number,
    slotElement: HTMLElement
  ): void {
    this.selectSlot(slotIndex);

    if (
      this.activePicker === 'color' &&
      this.activePickerSlotIndex === slotIndex
    ) {
      this.activePicker = null;
      this.activePickerSlotIndex = null;
      return;
    }

    this.activePicker = 'color';
    this.activePickerSlotIndex = slotIndex;

    this.showColorPicker = true;
    this.showIconPicker = false;

    this.positionPicker(slotElement);
  }

  toggleIconPicker(
    slotIndex: number,
    slotElement: HTMLElement
  ): void {
    this.selectSlot(slotIndex);

    if (
      this.activePicker === 'icon' &&
      this.activePickerSlotIndex === slotIndex
    ) {
      this.activePicker = null;
      this.activePickerSlotIndex = null;
      return;
    }

    this.activePicker = 'icon';
    this.activePickerSlotIndex = slotIndex;

    this.showIconPicker = true;
    this.showColorPicker = false;

    this.positionPicker(slotElement);
  }

  private positionPicker(slotElement: HTMLElement): void {
    requestAnimationFrame(() => {
      const slotRect = slotElement.getBoundingClientRect();

      const popover = slotElement.querySelector(
        '.slot-picker-popover'
      ) as HTMLElement | null;

      const naturalHeight = popover?.scrollHeight || 260;

      const gap = 12;
      const viewportPadding = 12;

      const spaceAbove = Math.max(
        0,
        slotRect.top - viewportPadding - gap
      );

      const spaceBelow = Math.max(
        0,
        window.innerHeight -
          slotRect.bottom -
          viewportPadding -
          gap
      );

      if (spaceBelow >= naturalHeight) {
        this.pickerDirection = 'down';
        this.pickerMaxHeight = spaceBelow;

      } else if (spaceAbove >= naturalHeight) {
        this.pickerDirection = 'up';
        this.pickerMaxHeight = spaceAbove;

      } else if (spaceBelow >= spaceAbove) {
        this.pickerDirection = 'down';
        this.pickerMaxHeight = Math.max(40, spaceBelow);

      } else {
        this.pickerDirection = 'up';
        this.pickerMaxHeight = Math.max(40, spaceAbove);
      }
    });
  }

  closePickers(): void {
    this.showColorPicker = false;
    this.showIconPicker = false;

    this.activePicker = null;
    this.activePickerSlotIndex = null;
  }

  updateSelectedSlotColor(color: string): void {
    const board = this.selectedBoard;

    if (!board || this.selectedSlotIndex === null) {
      return;
    }

    board.slots[this.selectedSlotIndex] = {
      ...board.slots[this.selectedSlotIndex],
      color: color || '#ffd700'
    };

    this.soundboard
      .saveBoard(board)
      .catch(err =>
        console.error('Slot color save error:', err)
      );

    this.showColorPicker = false;
    this.activePicker = null;
    this.activePickerSlotIndex = null;
  }

  updateSelectedSlotIcon(icon: string): void {
    const board = this.selectedBoard;

    if (!board || this.selectedSlotIndex === null) {
      return;
    }

    const cleanIcon =
      (icon || 'music_note').trim() || 'music_note';

    board.slots[this.selectedSlotIndex] = {
      ...board.slots[this.selectedSlotIndex],
      icon: cleanIcon
    };

    this.soundboard
      .saveBoard(board)
      .catch(err =>
        console.error('Slot icon save error:', err)
      );

    this.showIconPicker = false;
    this.activePicker = null;
    this.activePickerSlotIndex = null;
  }

  applyCustomSlotColor(color: string): void {
    if (!color) return;

    this.updateSelectedSlotColor(color);
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
    return (value || '')
      .replace(/\D/g, '')
      .slice(0, 2);
  }

  private toTwoDigits(value: number): string {
    return Math
      .floor(value)
      .toString()
      .padStart(2, '0');
  }

  private syncSeekFields(value: number) {
    this.seekMinInput =
      this.toTwoDigits(
        Math.floor(value / 60)
      );

    this.seekSecInput =
      this.toTwoDigits(
        Math.floor(value % 60)
      );
  }

  private syncStartFields() {
    this.startMinInput =
      this.toTwoDigits(
        Math.floor(this.startSec / 60)
      );

    this.startSecInput =
      this.toTwoDigits(
        Math.floor(this.startSec % 60)
      );
  }

  private syncEndFields() {
    this.endMinInput =
      this.toTwoDigits(
        Math.floor(this.endSec / 60)
      );

    this.endSecInput =
      this.toTwoDigits(
        Math.floor(this.endSec % 60)
      );
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
    if (!this.playerRef?.nativeElement) {
      return;
    }

    this.player.pause();

    this.player.currentTime = this.startSec;

    this.isCutterPlaying = false;
  }

  onSeekChange(value: number) {
    const safeValue = Math.max(
      0,
      Math.min(value, this.duration)
    );

    this.player.currentTime = safeValue;

    this.syncSeekFields(safeValue);
  }

  applySeekTyped() {
    let min = parseInt(this.seekMinInput, 10);
    let sec = parseInt(this.seekSecInput, 10);

    if (isNaN(min)) min = 0;
    if (isNaN(sec)) sec = 0;

    if (sec > 59) {
      sec = 59;
    }

    const total = Math.max(
      0,
      Math.min(
        min * 60 + sec,
        this.duration
      )
    );

    this.player.currentTime = total;

    this.syncSeekFields(total);
  }

  async onTempFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files || !input.files.length) {
      return;
    }

    this.originalFile = input.files[0];

    this.cutMessage = '';
    this.cutError = '';

    if (this.tempObjectUrl) {
      URL.revokeObjectURL(this.tempObjectUrl);
    }

    this.tempObjectUrl =
      URL.createObjectURL(this.originalFile);

    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }

    const arrayBuffer =
      await this.originalFile.arrayBuffer();

    this.audioBuffer =
      await this.audioCtx.decodeAudioData(
        arrayBuffer
      );

    this.duration =
      this.audioBuffer.duration;

    this.startSec = 0;
    this.endSec = this.duration;

    this.startMinInput = '';
    this.startSecInput = '';

    this.endMinInput = '';
    this.endSecInput = '';

    this.seekMinInput = '';
    this.seekSecInput = '';

    this.player.src =
      this.tempObjectUrl;

    this.player.volume =
      this.volume;

    this.player.currentTime =
      0;

    this.updateLengthError();
    this.bindTimeUpdate();
  }

  applyStartTyped() {
    let min =
      parseInt(
        this.startMinInput,
        10
      );

    let sec =
      parseInt(
        this.startSecInput,
        10
      );

    if (isNaN(min)) min = 0;
    if (isNaN(sec)) sec = 0;

    if (sec > 59) {
      sec = 59;
    }

    let total =
      min * 60 + sec;

    total =
      Math.max(0, total);

    total =
      Math.min(
        total,
        this.endSec
      );

    this.startSec =
      total;

    this.syncStartFields();

    if (
      this.player.currentTime <
      this.startSec
    ) {
      this.player.currentTime =
        this.startSec;

      this.syncSeekFields(
        this.startSec
      );
    }

    this.updateLengthError();
  }

  applyEndTyped() {
    let min =
      parseInt(
        this.endMinInput,
        10
      );

    let sec =
      parseInt(
        this.endSecInput,
        10
      );

    if (isNaN(min)) min = 0;
    if (isNaN(sec)) sec = 0;

    if (sec > 59) {
      sec = 59;
    }

    let total =
      min * 60 + sec;

    total =
      Math.min(
        total,
        this.duration
      );

    total =
      Math.max(
        total,
        this.startSec
      );

    this.endSec =
      total;

    this.syncEndFields();

    if (
      this.player.currentTime >
      this.endSec
    ) {
      this.player.currentTime =
        this.endSec;

      this.syncSeekFields(
        this.endSec
      );
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
    const numOfChan =
      buffer.numberOfChannels;

    const length =
      buffer.length *
      numOfChan *
      2 +
      44;

    const wavBuffer =
      new ArrayBuffer(length);

    const view =
      new DataView(wavBuffer);

    const channels = [];

    const sampleRate =
      buffer.sampleRate;

    let offset = 0;
    let pos = 0;

    const writeString =
      (str: string) => {
        for (
          let i = 0;
          i < str.length;
          i++
        ) {
          view.setUint8(
            pos++,
            str.charCodeAt(i)
          );
        }
      };

    writeString('RIFF');

    view.setUint32(
      pos,
      36 +
      buffer.length *
      2 *
      numOfChan,
      true
    );

    pos += 4;

    writeString('WAVEfmt ');

    view.setUint32(
      pos,
      16,
      true
    );

    pos += 4;

    view.setUint16(
      pos,
      1,
      true
    );

    pos += 2;

    view.setUint16(
      pos,
      numOfChan,
      true
    );

    pos += 2;

    view.setUint32(
      pos,
      sampleRate,
      true
    );

    pos += 4;

    view.setUint32(
      pos,
      sampleRate *
      2 *
      numOfChan,
      true
    );

    pos += 4;

    view.setUint16(
      pos,
      numOfChan * 2,
      true
    );

    pos += 2;

    view.setUint16(
      pos,
      16,
      true
    );

    pos += 2;

    writeString('data');

    view.setUint32(
      pos,
      buffer.length *
      2 *
      numOfChan,
      true
    );

    pos += 4;

    for (
      let i = 0;
      i < numOfChan;
      i++
    ) {
      channels.push(
        buffer.getChannelData(i)
      );
    }

    while (
      offset < buffer.length
    ) {
      for (
        let i = 0;
        i < numOfChan;
        i++
      ) {
        const sample =
          Math.max(
            -1,
            Math.min(
              1,
              channels[i][offset]
            )
          );

        view.setInt16(
          pos,
          sample < 0
            ? sample * 0x8000
            : sample * 0x7fff,
          true
        );

        pos += 2;
      }

      offset++;
    }

    return wavBuffer;
  }

  selectAll(event: FocusEvent) {
    const input =
      event.target as HTMLInputElement;

    input.select();
  }

  async cutAndUpload() {
    if (
      !this.originalFile ||
      !this.audioBuffer
    ) {
      this.cutError =
        'Nincs hangfájl betöltve.';

      return;
    }

    if (
      this.selectedLength <= 0
    ) {
      this.cutError =
        'A kijelölt hossz 0.';

      return;
    }

    if (
      this.selectedLength > 5
    ) {
      this.cutError =
        'Maximum 5 másodperc vágható!';

      return;
    }

    this.isCutting = true;

    this.cutError = '';
    this.cutMessage = '';

    try {
      const sampleRate =
        this.audioBuffer.sampleRate;

      const frames =
        Math.floor(
          this.selectedLength *
          sampleRate
        );

      const offline =
        new OfflineAudioContext(
          this.audioBuffer.numberOfChannels,
          frames,
          sampleRate
        );

      const src =
        offline.createBufferSource();

      src.buffer =
        this.audioBuffer;

      src.connect(
        offline.destination
      );

      src.start(
        0,
        this.startSec,
        this.selectedLength
      );

      const rendered =
        await offline.startRendering();

      const wav =
        this.audioBufferToWav(
          rendered
        );

      const blob =
        new Blob(
          [wav],
          {
            type: 'audio/wav'
          }
        );

      const nameBase =
        this.clipName.trim() ||
        'short_clip';

      const filePath =
        `shorts/${Date.now()}_${nameBase}.wav`;

      const fileRef =
        ref(
          storage,
          filePath
        );

      await uploadBytes(
        fileRef,
        blob
      );

      const url =
        await getDownloadURL(
          fileRef
        );

      const newClip: SfxTrack = {
        title: nameBase,
        url,
        path: filePath,
        duration:
          this.selectedLength
      };

      this.soundboard.addLocalSfx(
        newClip
      );

      this.cutMessage =
        'Sikeresen feltöltve!';

      this.clipName = '';

    } catch (err) {
      console.error(err);

      this.cutError =
        'Vágási hiba.';
    }

    this.isCutting = false;
  }
}