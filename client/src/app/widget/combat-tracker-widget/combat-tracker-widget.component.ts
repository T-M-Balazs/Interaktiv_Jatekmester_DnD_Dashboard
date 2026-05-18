import { Component } from '@angular/core';

interface Combatant {
  id: number;
  name: string;
  ac: number;
  hp: number;
  maxHp: number;
  damageInput: number | null;
  conditions: string[];
}

@Component({
  selector: 'app-combat-tracker-widget',
  templateUrl: './combat-tracker-widget.component.html',
  styleUrls: ['./combat-tracker-widget.component.css']
})
export class CombatTrackerWidgetComponent {
  newName = '';
  newAc = 10;
  newHp = 10;
  selectedCondition = '';

  private nextId = 1;

  combatants: Combatant[] = [];

  conditions = [
    'Blinded',
    'Charmed',
    'Deafened',
    'Frightened',
    'Grappled',
    'Incapacitated',
    'Invisible',
    'Paralyzed',
    'Petrified',
    'Poisoned',
    'Prone',
    'Restrained',
    'Stunned',
    'Unconscious',
    'Concentrating'
  ];

  addCombatant(): void {
    const name = this.newName.trim();

    if (!name) {
      return;
    }

    const hp = Math.max(0, Number(this.newHp) || 0);

    const combatant: Combatant = {
      id: this.nextId++,
      name,
      ac: Math.max(0, Number(this.newAc) || 0),
      hp,
      maxHp: hp,
      damageInput: null,
      conditions: []
    };

    if (this.selectedCondition) {
      combatant.conditions.push(this.selectedCondition);
    }

    this.combatants.push(combatant);

    this.newName = '';
    this.newAc = 10;
    this.newHp = 10;
    this.selectedCondition = '';
  }

  removeCombatant(id: number): void {
    this.combatants = this.combatants.filter(c => c.id !== id);
  }

  applyDamage(combatant: Combatant): void {
    const value = Number(combatant.damageInput);

    if (!value || Number.isNaN(value)) {
      combatant.damageInput = null;
      return;
    }

    combatant.hp = Math.max(0, combatant.hp - value);

    if (combatant.hp > combatant.maxHp) {
      combatant.maxHp = combatant.hp;
    }

    combatant.damageInput = null;
  }

  addCondition(combatant: Combatant, condition: string): void {
    if (!condition) {
      return;
    }

    if (!combatant.conditions.includes(condition)) {
      combatant.conditions.push(condition);
    }
  }

  removeCondition(combatant: Combatant, condition: string): void {
    combatant.conditions = combatant.conditions.filter(c => c !== condition);
  }

  updateHp(combatant: Combatant): void {
    combatant.hp = Math.max(0, Number(combatant.hp) || 0);

    if (combatant.hp > combatant.maxHp) {
      combatant.maxHp = combatant.hp;
    }
  }

  updateAc(combatant: Combatant): void {
    combatant.ac = Math.max(0, Number(combatant.ac) || 0);
  }

  getHpPercent(combatant: Combatant): number {
    if (!combatant.maxHp) {
      return 0;
    }

    return Math.max(0, Math.min(100, (combatant.hp / combatant.maxHp) * 100));
  }

  clearCombat(): void {
    this.combatants = [];
  }
}