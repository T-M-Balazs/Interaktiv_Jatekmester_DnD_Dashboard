import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AudioSource = 'player' | 'dashboard' | 'soundboard';

export interface AudioState {
  isPlaying: boolean;
  source: AudioSource | null;
}

@Injectable({
  providedIn: 'root'
})
export class AudioStateService {
  private stateSubject = new BehaviorSubject<AudioState>({
    isPlaying: false,
    source: null
  });

  state$ = this.stateSubject.asObservable();

  setPlaying(source: AudioSource): void {
    this.stateSubject.next({
      isPlaying: true,
      source
    });
  }

  stop(source: AudioSource): void {
    const current = this.stateSubject.value;

    if (current.source !== source) {
      return;
    }

    this.stateSubject.next({
      isPlaying: false,
      source: null
    });
  }

  clear(): void {
    this.stateSubject.next({
      isPlaying: false,
      source: null
    });
  }

  get currentState(): AudioState {
    return this.stateSubject.value;
  }
}