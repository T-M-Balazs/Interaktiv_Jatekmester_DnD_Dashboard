import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { CombatTrackerWidgetComponent } from './widget/combat-tracker-widget/combat-tracker-widget.component';
import { FormsModule } from '@angular/forms';
import { RouteReuseStrategy, RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DiceWidgetComponent } from './widget/dice-widget/dice-widget.component'; 
import { AppComponent } from './app.component';
import { NavMenuComponent } from './nav-menu/nav-menu.component';
import { ChatWidgetComponent } from './widget/chat-widget/chat-widget.component';
import { SearchWidgetComponent } from './widget/search-widget/search-widget.component';
import { BackgroundsFeatsComponent } from '../home/backgrounds-feats/backgrounds-feats.component';
import { StatblockWidgetComponent } from './widget/statblock-widget/statblock-widget.component';
import { HomeComponent } from '../home/home.component';
import { HokuszpokComponent } from '../hokuszpok/hokuszpok.component';
import { CommonModule } from '@angular/common';
import { ProfileFileWidgetComponent } from './widget/profile-file-widget/profile-file-widget.component';
import { PlayerComponent } from './player/player.component';
import { SoundboardSharedService } from './services/soundboard-shared.service';
import { SpellsItemsComponent } from '../home/spells-items/spells-items.component';
import { ClassesRacesComponent } from '../home/classes-races/classes-races.component';
// ✅ Standalone komponensek (NEM declarations!)
import { StatblockComponent } from './statblock/statblock.component';
import { SoundboardComponent } from './soundboard/soundboard.component';
import { RulesMechanicsComponent } from '../home/rules-mechanics/rules-mechanics.component';
import { ProfileComponent } from './profile/profile.component';
import { TexteditorWidgetComponent } from './widget/texteditor-widget/texteditor-widget.component';
import { LoginComponent } from './login/login.component';
import { ChatComponent } from './chat/chat.component';
import { PlayerWidgetComponent } from './widget/player-widget/player-widget.component';
import { SoundboardWidgetComponent } from './widget/soundboard-widget/soundboard-widget.component';
import { MonsterEditorComponent } from './statblock/editors/monster-editor/monster-editor.component';
import { MonstersComponent } from '../home/monsters/monsters.component';
import { AuthGuard } from './player/auth.guard';
import { HokuszpokRouteReuseStrategy } from './hokuszpok-route-reuse.strategy';
import { SessionComponent } from './session/session.component';
import { SystemContentComponent } from '../home/system-content/system-content.component';
import { FormatDescriptionPipe } from './services/format-description.pipe';

@NgModule({
  declarations: [
    AppComponent,
    CombatTrackerWidgetComponent,
    ChatWidgetComponent,
    NavMenuComponent,
    PlayerWidgetComponent,
    HomeComponent,
    DiceWidgetComponent,
    SoundboardComponent,
    HokuszpokComponent,
    PlayerComponent,
    LoginComponent,
    ChatComponent,
    SoundboardWidgetComponent,
    SpellsItemsComponent,
    ClassesRacesComponent,
    BackgroundsFeatsComponent,
    RulesMechanicsComponent,
    MonstersComponent,
    
    StatblockWidgetComponent,
    SearchWidgetComponent,
    SessionComponent,
    SystemContentComponent,
    FormatDescriptionPipe,
  ],
  imports: [
    BrowserModule.withServerTransition({ appId: 'ng-cli-universal' }),
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
     TexteditorWidgetComponent,
     MonsterEditorComponent,
      CommonModule,
      ProfileFileWidgetComponent,
     

    // ✅ Standalone komponensek ide jönnek
    StatblockComponent,
    
    RouterModule.forRoot([
      { path: '', component: HomeComponent, pathMatch: 'full' },
      { path: 'hokuszpok', component: HokuszpokComponent },
      { path: 'player', component: PlayerComponent, canActivate: [AuthGuard] },
      { path: 'session', component: SessionComponent, canActivate: [AuthGuard] },
      { path: 'spells-items', component: SpellsItemsComponent },
      { path: 'classes-races', component: ClassesRacesComponent },
      { path: 'backgrounds-feats', component: BackgroundsFeatsComponent },
      {  path: 'rules-mechanics', component: RulesMechanicsComponent},
      { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
      {
  path: 'monsters',
  component: MonstersComponent
},
      { path: 'system-content', component: SystemContentComponent },
      // ✅ standalone route-ok is simán mehetnek
      { path: 'soundboard', component: SoundboardComponent, canActivate: [AuthGuard] },
      { path: 'statblock', component: StatblockComponent, canActivate: [AuthGuard] },

      { path: 'login', component: LoginComponent },
      { path: 'chat', component: ChatComponent, canActivate: [AuthGuard] },

      { path: '**', redirectTo: '' }
    ])
  ],
  providers: [
    {
      provide: RouteReuseStrategy,
      useClass: HokuszpokRouteReuseStrategy
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
