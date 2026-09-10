import { Component, OnDestroy, OnInit } from '@angular/core';
import { SoundboardSharedService } from '../../services/soundboard-shared.service';

@Component({
  selector: 'app-soundboard-widget',
  templateUrl: './soundboard-widget.component.html',
  styleUrls: ['./soundboard-widget.component.css'],
  providers: [SoundboardSharedService]
})
export class SoundboardWidgetComponent implements OnInit, OnDestroy {
  constructor(public soundboard: SoundboardSharedService) {}

async ngOnInit(): Promise<void> {
  this.soundboard.setAudioSource('dashboard');
  await this.soundboard.ensureLoaded();

  if (!this.soundboard.selectedBoardId && this.soundboard.boards.length) {
    this.soundboard.selectBoard(this.soundboard.boards[0].id);
  }
}

  ngOnDestroy(): void {
    this.soundboard.stopSlot();
  }

  hasActiveSlots(): boolean {
    return !!this.soundboard.selectedBoard?.slots?.some(slot => !!slot.sfxUrl);
  }

  private hexToRgba(hex: string, alpha = 0.5): string {
    const validHex = (hex || '#ff5722').replace('#', '');
    const short = validHex.length === 3 ? validHex.split('').map(ch => ch + ch).join('') : validHex;
    const value = Number.parseInt(short, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  getSlotBackground(slot: { sfxUrl?: string | null; color?: string | null }): string {
    if (!slot?.sfxUrl) {
      return '#090909';
    }

    const color = slot.color || '#ff5722';
    return `radial-gradient(circle at center, ${color} 0%, ${color} 48%, ${this.hexToRgba(color, 0.55)} 68%, rgba(12, 12, 12, 0.92) 100%)`;
  }
}