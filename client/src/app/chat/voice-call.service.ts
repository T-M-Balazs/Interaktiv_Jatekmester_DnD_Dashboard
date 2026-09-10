import { Injectable } from '@angular/core';
import { Room, RoomEvent } from 'livekit-client';
import { auth } from '../player/firebase-config';
import { environment } from '../../environments/environment';

export interface RemoteParticipantControl {
  identity: string;
  name: string;
  muted: boolean;
  volume: number;
}

@Injectable({ providedIn: 'root' })
export class VoiceCallService {
  public isConnected = false;
  public isMuted = false;
  public activeConversationId = '';
  public remoteParticipants: RemoteParticipantControl[] = [];
  private room: Room | null = null;
  private roomName = '';
  private remoteAudioElements: HTMLMediaElement[] = [];
  private remoteAudioByIdentity = new Map<string, HTMLMediaElement[]>();
  private ringingContext: AudioContext | null = null;
  private ringingTimer: number | null = null;
  private joiningRoom: Promise<void> | null = null;

  async ensureMicrophoneAccess(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Ezen a böngészőn nem érhető el a mikrofon.');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (error: any) {
      if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        throw new Error(
          'A mikrofon hozzáférése tiltva van. Engedélyezd a mikrofont a böngésző webhelybeállításaiban, majd töltsd újra az oldalt.'
        );
      }

      if (error?.name === 'NotFoundError') {
        throw new Error('Nem található használható mikrofon ezen az eszközön.');
      }

      throw new Error('A mikrofon nem érhető el: ' + (error?.message || 'ismeretlen hiba.'));
    }
  }

  async joinRoom(conversationId: string, participantName?: string): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('Nincs bejelentkezett felhasználó.');
    }

    if (!conversationId) {
      throw new Error('Nincs kiválasztva beszélgetés.');
    }

    if (this.isConnected && this.roomName === conversationId) {
      return;
    }

    if (this.joiningRoom) {
      await this.joiningRoom;
      return;
    }

    this.joiningRoom = this.connectToRoom(conversationId, participantName);
    try {
      await this.joiningRoom;
    } finally {
      this.joiningRoom = null;
    }
  }

  private async connectToRoom(conversationId: string, participantName?: string): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('Nincs bejelentkezett felhasználó.');
    }

    const resolvedParticipantName =
      participantName ||
      auth.currentUser.displayName ||
      auth.currentUser.email ||
      auth.currentUser.uid ||
      'DND Player';

    const idToken = await auth.currentUser.getIdToken(true);
    const response = await fetch('/api/livekit/token', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        roomName: conversationId,
        participantName: resolvedParticipantName
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error('LiveKit token request failed: ' + text);
    }

    const data = await response.json();

    const room = new Room({
      adaptiveStream: true,
      dynacast: true
    });
    this.room = room;

    room.on(RoomEvent.Connected, () => {
      console.log('LiveKit room connected');
    });

    room.on(RoomEvent.Disconnected, () => {
      this.clearRemoteAudio();
      this.isConnected = false;
      this.isMuted = false;
      this.roomName = '';
      this.activeConversationId = '';
      if (this.room === room) {
        this.room = null;
      }
    });

    room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log('Participant connected:', participant.identity);
      this.addRemoteParticipant(participant.identity, participant.name || participant.identity);
    });

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      this.removeRemoteParticipant(participant.identity);
    });

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log('Track subscribed:', participant.identity, track.kind);

      if (track.kind === 'audio') {
        const audioElement = track.attach();
        audioElement.autoplay = true;
        audioElement.setAttribute('playsinline', 'true');
        audioElement.setAttribute('aria-hidden', 'true');
        audioElement.style.display = 'none';
        document.body.appendChild(audioElement);
        this.remoteAudioElements.push(audioElement);
        const elements = this.remoteAudioByIdentity.get(participant.identity) || [];
        elements.push(audioElement);
        this.remoteAudioByIdentity.set(participant.identity, elements);
        this.addRemoteParticipant(participant.identity, participant.name || participant.identity);
      }
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      track.detach().forEach((element) => element.remove());
      this.remoteAudioElements = this.remoteAudioElements.filter(
        (element) => element.isConnected
      );
      const elements = this.remoteAudioByIdentity.get(participant.identity) || [];
      this.remoteAudioByIdentity.set(
        participant.identity,
        elements.filter((element) => element.isConnected)
      );
    });

    await room.connect(environment.livekitUrl, data.token);
    await room.localParticipant.setMicrophoneEnabled(true);

    this.isConnected = true;
    this.isMuted = false;
    this.roomName = conversationId;
    this.activeConversationId = conversationId;
    room.participants.forEach((participant) => {
      this.addRemoteParticipant(participant.identity, participant.name || participant.identity);
    });
  }

  async leaveRoom(): Promise<void> {
    if (!this.room) {
      this.isConnected = false;
      this.isMuted = false;
      this.roomName = '';
      this.activeConversationId = '';
      return;
    }

    try {
      this.room.disconnect();
    } finally {
      this.clearRemoteAudio();
      this.isConnected = false;
      this.isMuted = false;
      this.roomName = '';
      this.activeConversationId = '';
      this.room = null;
    }
  }

  hasRemoteParticipants(): boolean {
    return this.room ? this.room.participants.size > 0 : this.remoteParticipants.length > 0;
  }

  startRinging(): void {
    if (this.ringingTimer !== null) {
      return;
    }

    try {
      this.ringingContext = new AudioContext();
      const playTone = () => {
        if (!this.ringingContext) {
          return;
        }

        const oscillator = this.ringingContext.createOscillator();
        const gain = this.ringingContext.createGain();
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, this.ringingContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, this.ringingContext.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ringingContext.currentTime + 0.32);
        oscillator.connect(gain).connect(this.ringingContext.destination);
        oscillator.start();
        oscillator.stop(this.ringingContext.currentTime + 0.34);
      };

      playTone();
      this.ringingTimer = window.setInterval(playTone, 1400);
    } catch (error) {
      console.warn('A csengőhang nem indítható el:', error);
    }
  }

  stopRinging(): void {
    if (this.ringingTimer !== null) {
      window.clearInterval(this.ringingTimer);
      this.ringingTimer = null;
    }

    this.ringingContext?.close();
    this.ringingContext = null;
  }

  setRemoteMuted(identity: string, muted: boolean): void {
    this.updateRemoteAudio(identity, (element) => {
      element.muted = muted;
    });
    const participant = this.remoteParticipants.find((item) => item.identity === identity);
    if (participant) {
      participant.muted = muted;
    }
  }

  setRemoteVolume(identity: string, volume: number): void {
    const safeVolume = Math.max(0, Math.min(1, volume));
    this.updateRemoteAudio(identity, (element) => {
      element.volume = safeVolume;
    });
    const participant = this.remoteParticipants.find((item) => item.identity === identity);
    if (participant) {
      participant.volume = safeVolume;
    }
  }

  async toggleMute(): Promise<boolean> {
    if (!this.room) {
      return false;
    }

    this.isMuted = !this.isMuted;
    await this.room.localParticipant.setMicrophoneEnabled(!this.isMuted);
    return this.isMuted;
  }

  private addRemoteParticipant(identity: string, name: string): void {
    if (!this.remoteParticipants.some((participant) => participant.identity === identity)) {
      this.remoteParticipants.push({ identity, name, muted: false, volume: 1 });
    }
  }

  private removeRemoteParticipant(identity: string): void {
    this.remoteParticipants = this.remoteParticipants.filter(
      (participant) => participant.identity !== identity
    );
    this.remoteAudioByIdentity.delete(identity);
  }

  private updateRemoteAudio(
    identity: string,
    update: (element: HTMLMediaElement) => void
  ): void {
    (this.remoteAudioByIdentity.get(identity) || []).forEach(update);
  }

  private clearRemoteAudio(): void {
    this.remoteAudioElements.forEach((element) => element.remove());
    this.remoteAudioElements = [];
    this.remoteAudioByIdentity.clear();
    this.remoteParticipants = [];
  }
}
