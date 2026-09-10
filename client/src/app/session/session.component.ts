import { Component, OnInit } from '@angular/core';
import { AuthService } from '../player/auth.service';
import {
  MechanicScope,
  MechanicType,
  NameGender,
  SessionCharacter,
  SessionData,
  SessionLocation,
  SessionMechanic,
  SessionService
} from './session.service';

interface EntityForm {
  id: string;
  name: string;
  race: string;
  description: string;
  imageUrl: string;
}

@Component({
  selector: 'app-session',
  templateUrl: './session.component.html',
  styleUrls: ['./session.component.css']
})
export class SessionComponent implements OnInit {
  sessions: SessionData[] = [];
  selectedSession: SessionData | null = null;
  loading = true;
  saving = false;
  error = '';
  notice = '';

  newSessionName = '';
  newSessionDescription = '';
  editingSession = false;

  editorSection: 'player' | 'npc' | 'location' | 'mechanic' | null = null;
  editingEntityId = '';
  entityForm: EntityForm = this.emptyEntityForm();

  mechanicName = '';
  mechanicDescription = '';
  mechanicType: MechanicType = 'counter';
  mechanicScope: MechanicScope = 'global';
  mechanicMin = 0;
  mechanicMax = 10;
  mechanicDefault = '0';
  mechanicOptions = '';
  editingMechanicId = '';

  npcRace = 'Human';
  npcGender: NameGender = 'neutral';
  readonly nameCategories = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Orc', 'Tiefling', 'Dragonborn', 'Firbolg', 'Goblin', 'Mixed Fantasy'];
  readonly genders: { value: NameGender; label: string }[] = [
    { value: 'male', label: 'Férfi' },
    { value: 'female', label: 'Női' },
    { value: 'neutral', label: 'Semleges' }
  ];
  selectedNameCategory = 'Mixed Fantasy';

  constructor(
    private sessionService: SessionService,
    public auth: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadSessions();
  }

  async loadSessions(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.sessions = await this.sessionService.listSessions();
      if (this.selectedSession) {
        this.selectedSession = this.sessions.find(item => item.id === this.selectedSession?.id) || null;
      }
    } catch (error: any) {
      this.error = error?.message || 'A sessionök betöltése sikertelen.';
    } finally {
      this.loading = false;
    }
  }

  async createSession(): Promise<void> {
    if (!this.newSessionName.trim()) return;
    try {
      const session = await this.sessionService.createSession(this.newSessionName, this.newSessionDescription);
      this.sessions = [session, ...this.sessions];
      this.selectedSession = session;
      this.newSessionName = '';
      this.newSessionDescription = '';
      this.setNotice('Session létrehozva.');
    } catch (error: any) {
      this.error = error?.message || 'A session létrehozása sikertelen.';
    }
  }

  selectSession(session: SessionData): void {
    this.selectedSession = session;
    this.closeEditor();
    this.editingSession = false;
  }

  async deleteSession(session: SessionData): Promise<void> {
    if (!confirm(`Biztosan törlöd ezt a sessiont?\n\n${session.name}`)) return;
    try {
      await this.sessionService.deleteSession(session.id, session.ownerId);
      this.sessions = this.sessions.filter(item => item.id !== session.id);
      if (this.selectedSession?.id === session.id) this.selectedSession = null;
      this.setNotice('Session törölve.');
    } catch (error: any) {
      this.error = error?.message || 'A session törlése sikertelen.';
    }
  }

  startEditSession(): void {
    this.editingSession = true;
  }

  async saveSessionDetails(): Promise<void> {
    if (!this.selectedSession || !this.selectedSession.name.trim()) return;
    await this.persist('Session adatai mentve.');
    this.editingSession = false;
  }

  openEntityEditor(section: 'player' | 'npc' | 'location', entity?: SessionCharacter | SessionLocation): void {
    this.editorSection = section;
    this.editingEntityId = entity?.id || '';
    this.entityForm = entity ? {
      id: entity.id,
      name: entity.name,
      race: 'race' in entity ? entity.race : '',
      description: entity.description,
      imageUrl: entity.imageUrl || ''
    } : this.emptyEntityForm();
  }

  closeEditor(): void {
    this.editorSection = null;
    this.editingEntityId = '';
    this.editingMechanicId = '';
    this.entityForm = this.emptyEntityForm();
  }

  async saveEntity(): Promise<void> {
    if (!this.selectedSession || !this.entityForm.name.trim() || !this.editorSection) return;
    const id = this.editingEntityId || this.createId();
    const entity = {
      id,
      name: this.entityForm.name.trim(),
      description: this.entityForm.description.trim(),
      imageUrl: this.entityForm.imageUrl.trim()
    } as SessionCharacter & SessionLocation;

    if (this.editorSection === 'location') {
      (entity as SessionLocation).imageUrl = this.entityForm.imageUrl.trim();
      this.selectedSession.locations = this.upsert(this.selectedSession.locations, entity as SessionLocation);
    } else {
      (entity as SessionCharacter).race = this.entityForm.race.trim() || 'Ismeretlen';
      const collection = this.editorSection === 'player' ? this.selectedSession.players : this.selectedSession.npcs;
      if (this.editorSection === 'player') {
        const wasNew = !this.editingEntityId;
        this.selectedSession.players = this.upsert(collection, entity as SessionCharacter);
        if (wasNew) this.sessionService.addPlayerToMechanics(this.selectedSession, id);
      } else {
        this.selectedSession.npcs = this.upsert(collection, entity as SessionCharacter);
      }
    }
    await this.persist('Elem mentve.');
    this.closeEditor();
  }

  async deleteEntity(section: 'player' | 'npc' | 'location', id: string): Promise<void> {
    if (!this.selectedSession || !confirm('Biztosan törlöd ezt az elemet?')) return;
    if (section === 'player') {
      this.selectedSession.players = this.selectedSession.players.filter(item => item.id !== id);
      this.sessionService.removePlayerFromMechanics(this.selectedSession, id);
    } else if (section === 'npc') {
      this.selectedSession.npcs = this.selectedSession.npcs.filter(item => item.id !== id);
    } else {
      this.selectedSession.locations = this.selectedSession.locations.filter(item => item.id !== id);
    }
    await this.persist('Elem törölve.');
  }

  openMechanicEditor(mechanic?: SessionMechanic): void {
    this.editorSection = 'mechanic';
    this.editingMechanicId = mechanic?.id || '';
    this.mechanicName = mechanic?.name || '';
    this.mechanicDescription = mechanic?.description || '';
    this.mechanicType = mechanic?.type || 'counter';
    this.mechanicScope = mechanic?.scope || 'global';
    this.mechanicMin = mechanic?.min ?? 0;
    this.mechanicMax = mechanic?.max ?? 10;
    this.mechanicDefault = String(mechanic?.defaultValue ?? 0);
    this.mechanicOptions = mechanic?.options.join(', ') || '';
  }

  async saveMechanic(): Promise<void> {
    if (!this.selectedSession || !this.mechanicName.trim()) return;
    const options = this.mechanicOptions.split(',').map(item => item.trim()).filter(Boolean);
    const max = Math.max(this.mechanicMin, Number(this.mechanicMax) || this.mechanicMin);
    const defaultValue = this.parseMechanicValue(this.mechanicDefault, this.mechanicType, this.mechanicMin, max, options);
    const input = {
      name: this.mechanicName,
      description: this.mechanicDescription,
      type: this.mechanicType,
      scope: this.mechanicScope,
      min: Number(this.mechanicMin) || 0,
      max,
      defaultValue,
      options
    };

    if (this.editingMechanicId) {
      const current = this.selectedSession.mechanics.find(item => item.id === this.editingMechanicId);
      if (current) {
        const updated = this.sessionService.createMechanic(input, this.selectedSession.players);
        updated.id = current.id;
        if (current.scope === updated.scope && current.type === updated.type) {
          updated.globalValue = this.sessionService.clampValue(current.globalValue, updated);
          updated.characterValues = { ...updated.characterValues };
          Object.keys(current.characterValues || {}).forEach(id => {
            updated.characterValues[id] = this.sessionService.clampValue(current.characterValues[id], updated);
          });
        }
        this.selectedSession.mechanics = this.upsert(this.selectedSession.mechanics, updated);
      }
    } else {
      this.selectedSession.mechanics.push(this.sessionService.createMechanic(input, this.selectedSession.players));
    }
    await this.persist('Mechanika mentve.');
    this.closeEditor();
  }

  async deleteMechanic(id: string): Promise<void> {
    if (!this.selectedSession || !confirm('Biztosan törlöd ezt a mechanikát?')) return;
    this.selectedSession.mechanics = this.selectedSession.mechanics.filter(item => item.id !== id);
    await this.persist('Mechanika törölve.');
  }

  async changeMechanicValue(mechanic: SessionMechanic, characterId?: string, delta = 0): Promise<void> {
    const key = characterId || '';
    const current = characterId ? mechanic.characterValues[characterId] : mechanic.globalValue;
    let value: number | boolean | string = current;
    if (mechanic.type === 'checkbox') value = !Boolean(current);
    else if (mechanic.type !== 'dropdown') value = Number(current) + delta;
    else if (delta !== 0) {
      const index = mechanic.options.indexOf(String(current));
      value = mechanic.options[(index + delta + mechanic.options.length) % mechanic.options.length] || '';
    }
    value = this.sessionService.clampValue(value, mechanic);
    if (characterId) mechanic.characterValues[key] = value;
    else mechanic.globalValue = value;
    await this.persist();
  }

  async setMechanicValue(mechanic: SessionMechanic, value: any, characterId?: string): Promise<void> {
    const next = this.sessionService.clampValue(value, mechanic);
    if (characterId) mechanic.characterValues[characterId] = next;
    else mechanic.globalValue = next;
    await this.persist();
  }

  generateNpcName(): void {
    const lists: Record<string, string[]> = {
      Human: ['Alden', 'Mira', 'Corvin', 'Elena'],
      Elf: ['Aelith', 'Thalion', 'Lethariel', 'Eryndor'],
      Dwarf: ['Borin', 'Dagna', 'Thrain', 'Kelda'],
      Halfling: ['Pip', 'Merry', 'Nessa', 'Tobin'],
      Orc: ['Gorak', 'Urzha', 'Morga', 'Krag'],
      Tiefling: ['Veyra', 'Zareth', 'Ilyra', 'Morthos'],
      Dragonborn: ['Arjhan', 'Akra', 'Balasar', 'Farideh'],
      Firbolg: ['Bramble', 'Oran', 'Maelis', 'Thorn'],
      Goblin: ['Nix', 'Grib', 'Zikka', 'Ruk'],
      'Mixed Fantasy': ['Seren', 'Kael', 'Nyx', 'Riven', 'Ashen']
    };
    const names = lists[this.selectedNameCategory] || lists['Mixed Fantasy'];
    const filtered = this.npcGender === 'neutral' ? names : names.filter((_, index) => this.npcGender === 'male' ? index % 2 === 0 : index % 2 === 1);
    this.entityForm.name = filtered[Math.floor(Math.random() * (filtered.length || names.length))] || names[0];
  }

  selectNameCategory(category: string): void {
    this.selectedNameCategory = category;
    this.npcRace = category;
  }

  getMechanicValue(mechanic: SessionMechanic, characterId?: string): any {
    return characterId ? mechanic.characterValues[characterId] : mechanic.globalValue;
  }

  getProgressPercent(mechanic: SessionMechanic, characterId?: string): number {
    const value = Number(this.getMechanicValue(mechanic, characterId));
    return mechanic.max === mechanic.min ? 100 : ((value - mechanic.min) / (mechanic.max - mechanic.min)) * 100;
  }

  isNumberMechanic(mechanic: SessionMechanic): boolean {
    return ['counter', 'progress', 'slider'].includes(mechanic.type);
  }

  private async persist(message = ''): Promise<void> {
    if (!this.selectedSession || this.saving) return;
    this.saving = true;
    try {
      await this.sessionService.saveSession(this.selectedSession);
      if (message) this.setNotice(message);
      this.sessions = this.sessions.map(item => item.id === this.selectedSession?.id ? this.selectedSession as SessionData : item);
    } catch (error: any) {
      this.error = error?.message || 'A mentés sikertelen.';
    } finally {
      this.saving = false;
    }
  }

  private parseMechanicValue(value: string, type: MechanicType, min: number, max: number, options: string[]): number | boolean | string {
    if (type === 'checkbox') return value === 'true' || value === '1';
    if (type === 'dropdown') return options[0] || value || '';
    const numeric = Number(value);
    return Math.min(max, Math.max(min, Number.isFinite(numeric) ? numeric : min));
  }

  private emptyEntityForm(): EntityForm {
    return { id: '', name: '', race: '', description: '', imageUrl: '' };
  }

  private upsert<T extends { id: string }>(items: T[], item: T): T[] {
    const existingIndex = items.findIndex(current => current.id === item.id);
    if (existingIndex === -1) return [...items, item];
    return items.map(current => current.id === item.id ? item : current);
  }

  private createId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private setNotice(message: string): void {
    this.notice = message;
    window.setTimeout(() => this.notice = '', 2600);
  }
}
