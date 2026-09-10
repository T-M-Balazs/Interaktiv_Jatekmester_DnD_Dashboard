import { Component, OnDestroy, OnInit } from '@angular/core';
import { PlayerSharedService } from '../../services/player-shared.service';

@Component({
  selector: 'app-player-widget',
  templateUrl: './player-widget.component.html',
  styleUrls: ['./player-widget.component.css'],
  providers: [PlayerSharedService]
})
export class PlayerWidgetComponent implements OnInit, OnDestroy {
  constructor(public player: PlayerSharedService) {}

async ngOnInit(): Promise<void> {
  
  this.player.setAudioSource('dashboard');
  await this.player.ensureLoaded();
}
  // Időformázó függvény a HTML-nek
  formatTime(seconds: number): string {
    if (seconds === undefined || seconds === null || isNaN(seconds)) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  ngOnDestroy(): void {
    this.player.resetPlayerState();
  }
}