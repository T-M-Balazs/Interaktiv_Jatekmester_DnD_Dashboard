import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AudioSource = 'player' | 'dashboard' | 'soundboard';

export interface AudioState {
  isPlaying: boolean;
  source: AudioSource | null;
  activeSources: AudioSource[];
}

@Injectable({
  providedIn: 'root'
})
export class AudioStateService {
  private activeSources = new Map<string, AudioSource>();

  private stateSubject = new BehaviorSubject<AudioState>({
    isPlaying: false,
    source: null,
    activeSources: []
  });

  state$ = this.stateSubject.asObservable();

  setPlaying(source: AudioSource): void {
    this.setPlayingForInstance(source, 'default');
  }

  stop(source: AudioSource): void {
    this.stopForInstance(source, 'default');
  }

  setPlayingForInstance(source: AudioSource, instanceId: string): void {
    this.activeSources.set(instanceId, source);
    this.publishState();
  }

  stopForInstance(source: AudioSource, instanceId: string): void {
    const activeSource = this.activeSources.get(instanceId);

    if (activeSource !== source) {
      return;
    }

    this.activeSources.delete(instanceId);
    this.publishState();
  }

  clear(): void {
    this.activeSources.clear();
    this.publishState();
  }

  get currentState(): AudioState {
    return this.stateSubject.value;
  }

  private publishState(): void {
    const sources = [...this.activeSources.values()];

    this.stateSubject.next({
      isPlaying: sources.length > 0,
      source: sources.length > 0 ? sources[sources.length - 1] : null,
      activeSources: [...new Set(sources)]
    });
  }
}