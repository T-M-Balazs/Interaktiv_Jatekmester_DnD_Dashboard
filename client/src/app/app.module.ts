import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { CombatTrackerWidgetComponent } from './widget/combat-tracker-widget/combat-tracker-widget.component';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DiceWidgetComponent } from './widget/dice-widget/dice-widget.component'; 
import { AppComponent } from './app.component';
import { NavMenuComponent } from './nav-menu/nav-menu.component';
import { ChatWidgetComponent } from './widget/chat-widget/chat-widget.component';
import { SearchWidgetComponent } from './widget/search-widget/search-widget.component';
import { BackgroundsFeatsComponent } from 'src/home/backgrounds-feats/backgrounds-feats.component';
import { StatblockWidgetComponent } from './widget/statblock-widget/statblock-widget.component';
import { HomeComponent } from '../home/home.component';
import { CounterComponent } from './counter/counter.component';
import { FetchDataComponent } from './fetch-data/fetch-data.component';
import { HokuszpokComponent } from '../hokuszpok/hokuszpok.component';
import { CommonModule } from '@angular/common';
import { ProfileFileWidgetComponent } from './widget/profile-file-widget/profile-file-widget.component';
import { PlayerComponent } from './player/player.component';
import { SoundboardSharedService } from './services/soundboard-shared.service';
import { SpellsItemsComponent } from '../home/spells-items/spells-items.component';
import { ClassesRacesComponent } from 'src/home/classes-races/classes-races.component';
// ✅ Standalone komponensek (NEM declarations!)
import { StatblockComponent } from './statblock/statblock.component';
import { SoundboardComponent } from './soundboard/soundboard.component';
import { RulesMechanicsComponent } from 'src/home/rules-mechanics/rules-mechanics.component';
import { ProfileComponent } from './profile/profile.component';
import { TexteditorWidgetComponent } from './widget/texteditor-widget/texteditor-widget.component';
import { LoginComponent } from './login/login.component';
import { ChatComponent } from './chat/chat.component';
import { PlayerWidgetComponent } from './widget/player-widget/player-widget.component';
import { SoundboardWidgetComponent } from './widget/soundboard-widget/soundboard-widget.component';
import { MonsterEditorComponent } from './statblock/editors/monster-editor/monster-editor.component';
import { MonstersComponent } from 'src/home/monsters/monsters.component';

@NgModule({
  declarations: [
    AppComponent,
    CombatTrackerWidgetComponent,
    ChatWidgetComponent,
    NavMenuComponent,
    PlayerWidgetComponent,
    HomeComponent,
    CounterComponent,
    DiceWidgetComponent,
    SoundboardComponent,
    FetchDataComponent,
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
      { path: 'player', component: PlayerComponent },
      { path: 'spells-items', component: SpellsItemsComponent },
      { path: 'classes-races', component: ClassesRacesComponent },
      { path: 'backgrounds-feats', component: BackgroundsFeatsComponent },
      {  path: 'rules-mechanics', component: RulesMechanicsComponent},
      { path: 'profile', component: ProfileComponent },
      {
  path: 'monsters',
  component: MonstersComponent
},
      // ✅ standalone route-ok is simán mehetnek
      { path: 'soundboard', component: SoundboardComponent },
      { path: 'statblock', component: StatblockComponent },

      { path: 'login', component: LoginComponent },
      { path: 'chat', component: ChatComponent },

      { path: '**', redirectTo: '' }
    ])
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
