import { Component, OnInit } from '@angular/core';
import { PlayerSharedService } from '../../services/player-shared.service';

@Component({
  selector: 'app-player-widget',
  templateUrl: './player-widget.component.html',
  styleUrls: ['./player-widget.component.css'],
  // EZ A SOR KELL: így minden widget saját szervizpéldányt kap
  providers: [PlayerSharedService] 
})
export class PlayerWidgetComponent implements OnInit {
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
}