import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from './player/auth.service';
import { Router } from '@angular/router';
import { ChatService } from './chat/chat.service';
import { onAuthStateChanged, Unsubscribe as AuthUnsubscribe } from 'firebase/auth';
import { auth } from './player/firebase-config';
import { SystemDataService } from './services/system-data.service';
import { PlayerSharedService } from './services/player-shared.service';
import { ChatSharedService } from './services/chat-shared.service';
import { SoundboardSharedService } from './services/soundboard-shared.service';
import { AudioStateService, AudioState } from './services/audio-state.service';

interface GlobalSearchResult {
  id: string;
  name: string;
  type:
    | 'spell'
    | 'item'
    | 'class'
    | 'race'
    | 'subclass'
    | 'background'
    | 'feat'
    | 'rule'
    | 'monster';
  route: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
      audioState: AudioState = {
  isPlaying: false,
  source: null
};
  currentUser: any = null;
  unreadChatTotal = 0;

  globalSearchText = '';
  globalSearchResults: GlobalSearchResult[] = [];

  private unreadUnsub: (() => void) | null = null;
  private authUnsub: AuthUnsubscribe | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private chatService: ChatService,
    private systemData: SystemDataService,
    private player: PlayerSharedService,
    private chatState: ChatSharedService,
    private soundboard: SoundboardSharedService,
    private audioStateService: AudioStateService
  ) {}

  ngOnInit(): void {
    this.systemData.loadAllData().catch(err => {
      console.error('System data preload error:', err);
    });
this.audioStateService.state$.subscribe(state => {
  this.audioState = state;
});
    this.player.ensureLoaded().catch(err => {
  console.error('Player preload error:', err);
});
this.soundboard.ensureLoaded().catch(err => {
  console.error('Soundboard preload error:', err);
});
this.chatState.init();

    this.authService.userProfile$.subscribe(user => {
      this.currentUser = user;
    });

    this.authUnsub = onAuthStateChanged(auth, (user) => {
      if (this.unreadUnsub) {
        this.unreadUnsub();
        this.unreadUnsub = null;
      }

      if (!user) {
        this.unreadChatTotal = 0;
        return;
      }
  

      this.unreadUnsub = this.chatService.listenUnreadTotal(user.uid, (count) => {
        this.unreadChatTotal = count;
      });
    });
  }

  logout(): void {
    this.authService.logout().then(() => {
      this.router.navigate(['/login']);
    });
  }

  async onGlobalSearchChange(): Promise<void> {
    const text = this.globalSearchText.trim().toLowerCase();

    if (text.length < 2) {
      this.globalSearchResults = [];
      return;
    }

    const all = await this.loadGlobalSearchData();

    this.globalSearchResults = all
      .filter(item => item.name.toLowerCase().includes(text))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 50);
  }

  openGlobalSearchResult(result: GlobalSearchResult): void {
    this.globalSearchText = '';
    this.globalSearchResults = [];

    this.router.navigate([result.route], {
      queryParams: {
        type: result.type,
        id: result.id
      }
    });
  }

  private async loadGlobalSearchData(): Promise<GlobalSearchResult[]> {
    await this.systemData.loadAllData();

    return this.systemData.getAllSearchItems().map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      route: this.getRouteForSearchType(item.type)
    }));
  }

  private getRouteForSearchType(type: GlobalSearchResult['type']): string {
    switch (type) {
      case 'spell':
      case 'item':
        return '/spells-items';

      case 'class':
      case 'race':
      case 'subclass':
        return '/classes-races';

      case 'background':
      case 'feat':
        return '/backgrounds-feats';

      case 'rule':
        return '/rules-mechanics';

      case 'monster':
        return '/monsters';

      default:
        return '/';
    }
  }

  ngOnDestroy(): void {
    if (this.unreadUnsub) {
      this.unreadUnsub();
      this.unreadUnsub = null;
    }

    if (this.authUnsub) {
      this.authUnsub();
      this.authUnsub = null;
    }
  }
}