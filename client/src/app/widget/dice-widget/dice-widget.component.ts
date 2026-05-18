import { Component } from '@angular/core';

interface DiceType {
  label: string;
  sides: number;
}

type RollMode = 'normal' | 'advantage' | 'disadvantage';

interface DiceGroup {
  id: number;
  count: number;
  dice: DiceType;
  mode: RollMode;
}

interface GroupRollResult {
  groupId: number;
  label: string;
  count: number;
  sides: number;
  mode: RollMode;
  rolls: number[];
  total: number;
  picked?: number;
  firstAdvRoll?: number;
  secondAdvRoll?: number;
}

@Component({
  selector: 'app-dice-widget',
  templateUrl: './dice-widget.component.html',
  styleUrls: ['./dice-widget.component.css']
})
export class DiceWidgetComponent {
  diceTypes: DiceType[] = [
    { label: 'd4',  sides: 4   },
    { label: 'd6',  sides: 6   },
    { label: 'd8',  sides: 8   },
    { label: 'd10', sides: 10  },
    { label: 'd%',  sides: 100 },
    { label: 'd12', sides: 12  },
    { label: 'd20', sides: 20  }
  ];

  diceGroups: DiceGroup[] = [
    { id: 1, count: 1, dice: { label: 'd20', sides: 20 }, mode: 'normal' }
  ];

  results: GroupRollResult[] = [];
  grandTotal = 0;
  muted = false;

  private nextGroupId = 2;

  compareDice = (a: DiceType, b: DiceType) => a?.sides === b?.sides;

  addGroup(): void {
    this.diceGroups.push({
      id: this.nextGroupId++,
      count: 1,
      dice: this.diceTypes[1],
      mode: 'normal'
    });
  }

  removeGroup(groupId: number): void {
    if (this.diceGroups.length === 1) return;
    this.diceGroups = this.diceGroups.filter(g => g.id !== groupId);
    this.results   = this.results.filter(r => r.groupId !== groupId);
    this.recalculateGrandTotal();
  }

  setMode(group: DiceGroup, mode: RollMode): void {
    if (!this.canUseAdvantage(group) && mode !== 'normal') return;
    group.mode = group.mode === mode ? 'normal' : mode;
  }

  toggleMuted(): void {
    this.muted = !this.muted;
  }

  rollAll(): void {
    this.results = this.diceGroups.map(g => this.rollGroup(g));
    this.recalculateGrandTotal();
    this.playRollSound();
  }

  canUseAdvantage(group: DiceGroup): boolean {
    return group.dice.sides === 20 && Math.floor(group.count) === 1;
  }

  isAdvantageActive(group: DiceGroup): boolean {
    return group.mode === 'advantage';
  }

  isDisadvantageActive(group: DiceGroup): boolean {
    return group.mode === 'disadvantage';
  }

  isCritical(value: number, sides: number): boolean {
    return sides === 20 && value === 20;
  }

  isCriticalFail(value: number, sides: number): boolean {
    return sides === 20 && value === 1;
  }

  private rollGroup(group: DiceGroup): GroupRollResult {
    const safeCount = Math.max(1, Math.floor(Number(group.count) || 1));

    if (group.dice.sides === 20 && safeCount === 1 && group.mode !== 'normal') {
      const first  = this.randomRoll(20);
      const second = this.randomRoll(20);
      const picked = group.mode === 'advantage'
        ? Math.max(first, second)
        : Math.min(first, second);

      return {
        groupId: group.id,
        label: group.dice.label,
        count: 1,
        sides: 20,
        mode: group.mode,
        rolls: [picked],
        total: picked,
        picked,
        firstAdvRoll: first,
        secondAdvRoll: second
      };
    }

    const rolls = Array.from({ length: safeCount }, () => this.randomRoll(group.dice.sides));
    const total = rolls.reduce((sum, v) => sum + v, 0);

    return {
      groupId: group.id,
      label: group.dice.label,
      count: safeCount,
      sides: group.dice.sides,
      mode: group.mode,
      rolls,
      total
    };
  }

  private randomRoll(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
  }

  private recalculateGrandTotal(): void {
    this.grandTotal = this.results.reduce((sum, r) => sum + r.total, 0);
  }

  private playRollSound(): void {
    if (this.muted) return;

    const AudioCtx = window.AudioContext || (window as Window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

    if (!AudioCtx) return;

    const ctx        = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gainNode   = ctx.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(220, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
    oscillator.onended = () => { void ctx.close(); };
  }
}