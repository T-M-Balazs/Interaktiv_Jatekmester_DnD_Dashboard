import { Component, OnInit } from '@angular/core';
import { SoundboardSharedService } from '../../services/soundboard-shared.service';

@Component({
  selector: 'app-soundboard-widget',
  templateUrl: './soundboard-widget.component.html',
  styleUrls: ['./soundboard-widget.component.css'],
  providers: [SoundboardSharedService]
})
export class SoundboardWidgetComponent implements OnInit {
  constructor(public soundboard: SoundboardSharedService) {}

async ngOnInit(): Promise<void> {
  this.soundboard.setAudioSource('dashboard');
  await this.soundboard.ensureLoaded();

  if (!this.soundboard.selectedBoardId && this.soundboard.boards.length) {
    this.soundboard.selectBoard(this.soundboard.boards[0].id);
  }
}

  hasActiveSlots(): boolean {
    return !!this.soundboard.selectedBoard?.slots?.some(slot => !!slot.sfxUrl);
  }
}