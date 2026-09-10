import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, Unsubscribe } from 'firebase/auth';
import { auth, db } from '../app/player/firebase-config';
import { AuthService } from '../app/player/auth.service';
import { ProfileFileWidgetComponent } from '../app/widget/profile-file-widget/profile-file-widget.component';
interface PanelItem {
  id: number;
  widget: string | null;
  x: number;
  y: number;
  zIndex?: number;
  widthPx?: number;
  heightPx?: number;
}

@Component({
  selector: 'app-hokuszpok',
  templateUrl: './hokuszpok.component.html',
  styleUrls: ['./hokuszpok.component.css']
})
export class HokuszpokComponent implements AfterViewInit, OnDestroy {
  toolbarOpen = false;
  constructor(private auth: AuthService) {}
  @ViewChild('hokuszContainer', { static: true })
  containerRef!: ElementRef<HTMLDivElement>;

  public activeListIndex: number | null = null;

 public widgetOptions = [
  { id: 'player', name: 'Zenelejátszó', icon: '🎵' },
  { id: 'chat', name: 'Chat', icon: '💬' },
  { id: 'soundboard', name: 'Soundboard', icon: '🔊' },
  { id: 'dice', name: 'Kockadobó', icon: '🎲' },
  { id: 'texteditor', name: 'Szövegszerkesztő', icon: '✍️' },
  { id: 'search', name: 'Compendium kereső', icon: '🔎' },
  { id: 'statblock', name: 'Statblock néző', icon: '🐉' },
  { id: 'profile-files', name: 'Fájl kereső', icon: '📁' },
  { id: 'combat-tracker', name: 'Harckövető', icon: '⚔️' },
];

  public panels: PanelItem[] = [this.createPanel(1, 24, 24)];

  private nextPanelId = 2;
  private nextZIndex = 2;
  private readonly minPanelWidth = 240;
  private readonly minPanelHeight = 180;
  private isPanelResizing = false;
  private isPanelMoving = false;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private panelResizeStartWidth = 0;
  private panelResizeStartHeight = 0;
  private panelResizeRef: PanelItem | null = null;
  private panelMoveStartX = 0;
  private panelMoveStartY = 0;
  private panelMoveRef: PanelItem | null = null;
  private readonly panelDragThreshold = 4;
  private authUnsubscribe: Unsubscribe | null = null;

  async ngAfterViewInit(): Promise<void> {
    this.authUnsubscribe = onAuthStateChanged(auth, async user => {
      if (!user) {
        this.resetDashboardState();
        return;
      }

      await this.loadDashboard(user.uid);
      this.normalizePanels();
    });

    window.addEventListener('mousemove', (e: MouseEvent) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.stopDragging());
  }

  ngOnDestroy(): void {
    this.authUnsubscribe?.();
    this.authUnsubscribe = null;
    document.body.classList.remove('resizing-panel', 'moving-panel');
  }

  public trackByPanelId(_: number, panel: PanelItem): number {
    return panel.id;
  }

  public addPanel(): void {
    const panel = this.createPanel(
      this.nextPanelId++,
      24,
      24 + this.panels.length * 28
    );
    panel.zIndex = this.nextZIndex++;
    this.panels.push(panel);
    this.saveDashboard();
  }

  public startPanelResize(event: MouseEvent, panel: PanelItem): void {
    event.preventDefault();
    event.stopPropagation();
    this.isPanelResizing = true;
    this.pointerStartX = event.clientX;
    this.pointerStartY = event.clientY;
    this.panelResizeRef = panel;
    this.panelResizeStartWidth = panel.widthPx ?? 240;
    this.panelResizeStartHeight = panel.heightPx ?? this.getDefaultPanelHeight();
    document.body.classList.add('resizing-panel');
  }

  public startPanelMove(event: MouseEvent, panel: PanelItem): void {
    if (this.isPanelResizing) return;

    const target = event.target as HTMLElement | null;
    if (target && target.closest(
      'button, input, textarea, select, option, a, label, [contenteditable="true"], .panel-action, .add-btn, .widget-scroll, .widget-frame, .widget-container'
    )) {
      return;
    }

    event.preventDefault();
    this.isPanelMoving = false;
    this.pointerStartX = event.clientX;
    this.pointerStartY = event.clientY;
    this.panelMoveStartX = panel.x;
    this.panelMoveStartY = panel.y;
    this.panelMoveRef = panel;
  }

  public clearAllPanels(): void {
    this.activeListIndex = null;
    this.panels = [];
    void this.saveDashboard();
  }
  public removePanel(panelId: number): void {
    this.panels = this.panels.filter(panel => panel.id !== panelId);

    if (this.activeListIndex === panelId) {
      this.activeListIndex = null;
    }

    this.saveDashboard();
  }

  public toggleList(panelId: number): void {
    this.activeListIndex = this.activeListIndex === panelId ? null : panelId;
  }

  public selectWidget(panelId: number, widgetId: string): void {
    const panel = this.findPanel(panelId);
    if (!panel) return;

    panel.widget = widgetId;
    this.activeListIndex = null;
    this.saveDashboard();
  }

  public clearWidget(panelId: number): void {
    const panel = this.findPanel(panelId);
    if (!panel) return;

    panel.widget = null;
    this.saveDashboard();
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isPanelResizing && this.panelResizeRef) {
      this.panelResizeRef.widthPx = Math.max(
        this.minPanelWidth,
        this.panelResizeStartWidth + event.clientX - this.pointerStartX
      );
      this.panelResizeRef.heightPx = Math.max(
        this.minPanelHeight,
        this.panelResizeStartHeight + event.clientY - this.pointerStartY
      );

      this.applyResizeSnap(this.panelResizeRef);
      return;
    }

    if (this.panelMoveRef && !this.isPanelMoving) {
      const moveDistance = Math.hypot(
        event.clientX - this.pointerStartX,
        event.clientY - this.pointerStartY
      );

      if (moveDistance < this.panelDragThreshold) {
        return;
      }

      this.isPanelMoving = true;
      this.panelMoveRef.zIndex = this.nextZIndex++;
      document.body.classList.add('moving-panel');
    }

    if (this.isPanelMoving && this.panelMoveRef) {
      this.panelMoveRef.x = Math.max(0, this.panelMoveStartX + event.clientX - this.pointerStartX);
      this.panelMoveRef.y = Math.max(0, this.panelMoveStartY + event.clientY - this.pointerStartY);
      this.applyMoveSnap(this.panelMoveRef);
    }
  }

  private stopDragging(): void {
    this.isPanelResizing = false;
    this.isPanelMoving = false;
    this.panelResizeRef = null;
    this.panelMoveRef = null;
    document.body.classList.remove('resizing-panel', 'moving-panel');
    this.saveDashboard();
    
  }

  private findPanel(panelId: number): PanelItem | null {
    return this.panels.find(panel => panel.id === panelId) ?? null;
  }

  private createPanel(id: number, x: number, y: number): PanelItem {
    return {
      id,
      widget: null,
      x,
      y,
      widthPx: this.getDefaultPanelWidth(),
      heightPx: this.getDefaultPanelHeight()
    };
  }

  private getDefaultPanelWidth(): number {
    return Math.max(this.minPanelWidth, (this.containerRef?.nativeElement.clientWidth ?? 900) * 0.3);
  }

  private getDefaultPanelHeight(): number {
    const viewportHeight = this.containerRef?.nativeElement.parentElement?.clientHeight ?? 640;
    return Math.max(this.minPanelHeight, viewportHeight * 0.5);
  }

  private normalizePanels(): void {
    this.panels.forEach(panel => {
      panel.x = Math.max(0, Number.isFinite(Number(panel.x)) ? Number(panel.x) : 24);
      panel.y = Math.max(0, Number.isFinite(Number(panel.y)) ? Number(panel.y) : 24);
      panel.widthPx = Math.max(
        this.minPanelWidth,
        Number.isFinite(Number(panel.widthPx))
          ? Number(panel.widthPx)
          : this.getDefaultPanelWidth()
      );
      panel.heightPx = Math.max(
        this.minPanelHeight,
        Number.isFinite(Number(panel.heightPx))
          ? Number(panel.heightPx)
          : this.getDefaultPanelHeight()
      );
      panel.zIndex ??= this.nextZIndex++;
    });

    const highestPanelId = Math.max(0, ...this.panels.map(panel => Number(panel.id) || 0));
    this.nextPanelId = Math.max(this.nextPanelId, highestPanelId + 1);
  }

  public getCanvasHeight(): number {
    return Math.max(500, ...this.panels.map(panel => panel.y + (panel.heightPx ?? this.getDefaultPanelHeight()) + 24));
  }

  public getCanvasWidth(): number {
    const viewportWidth = this.containerRef?.nativeElement.clientWidth ?? 900;
    return Math.max(900, viewportWidth, ...this.panels.map(panel => panel.x + (panel.widthPx ?? this.getDefaultPanelWidth()) + 24));
  }

  private getPanelWidth(panel: PanelItem): number {
    return panel.widthPx ?? this.getDefaultPanelWidth();
  }

  private getPanelHeight(panel: PanelItem): number {
    return panel.heightPx ?? this.getDefaultPanelHeight();
  }

  private hasPanelOverlap(panel: PanelItem): boolean {
    const panelLeft = panel.x;
    const panelTop = panel.y;
    const panelRight = panelLeft + this.getPanelWidth(panel);
    const panelBottom = panelTop + this.getPanelHeight(panel);

    return this.panels.some(other => {
      if (other.id === panel.id) return false;

      const otherLeft = other.x;
      const otherTop = other.y;
      const otherRight = otherLeft + (other.widthPx ?? this.getDefaultPanelWidth());
      const otherBottom = otherTop + (other.heightPx ?? this.getDefaultPanelHeight());

      return panelLeft < otherRight && panelRight > otherLeft &&
        panelTop < otherBottom && panelBottom > otherTop;
    });
  }

  private applyMoveSnap(panel: PanelItem): void {
    const snapDistance = 18;
    const panelWidth = this.getPanelWidth(panel);
    const panelHeight = this.getPanelHeight(panel);
    const xCandidates: number[] = [0, Math.max(0, this.getCanvasWidth() - panelWidth)];
    const yCandidates: number[] = [0];

    this.panels.forEach(other => {
      if (other.id === panel.id) return;

      const otherWidth = other.widthPx ?? this.getDefaultPanelWidth();
      const otherHeight = other.heightPx ?? this.getDefaultPanelHeight();
      const otherLeft = other.x;
      const otherTop = other.y;
      const otherRight = otherLeft + otherWidth;
      const otherBottom = otherTop + otherHeight;

      const horizontalOverlap = panel.y < otherBottom + snapDistance && panel.y + panelHeight > otherTop - snapDistance;
      const verticalOverlap = panel.x < otherRight + snapDistance && panel.x + panelWidth > otherLeft - snapDistance;

      if (horizontalOverlap) {
        xCandidates.push(otherLeft + otherWidth, otherLeft - panelWidth, otherLeft, otherRight - panelWidth, otherRight);
      }
      if (verticalOverlap) {
        yCandidates.push(otherTop + otherHeight, otherTop - panelHeight, otherTop, otherBottom - panelHeight, otherBottom);
      }
    });

    const chooseNearest = (currentValue: number, candidates: number[]): number => {
      let bestValue = currentValue;
      let bestDistance = Number.POSITIVE_INFINITY;

      candidates.forEach(candidate => {
        const distance = Math.abs(candidate - currentValue);
        if (distance <= snapDistance && distance < bestDistance) {
          bestValue = candidate;
          bestDistance = distance;
        }
      });

      return bestValue;
    };

    panel.x = chooseNearest(panel.x, xCandidates);
    panel.y = chooseNearest(panel.y, yCandidates);
  }

  private applyResizeSnap(panel: PanelItem): void {
    const snapDistance = 18;
    const baseWidth = this.getPanelWidth(panel);
    const baseHeight = this.getPanelHeight(panel);
    const xReference = panel.x;
    const yReference = panel.y;
    let width = baseWidth;
    let height = baseHeight;

    this.panels.forEach(other => {
      if (other.id === panel.id) return;

      const otherWidth = other.widthPx ?? this.getDefaultPanelWidth();
      const otherHeight = other.heightPx ?? this.getDefaultPanelHeight();
      const otherLeft = other.x;
      const otherTop = other.y;
      const otherRight = otherLeft + otherWidth;
      const otherBottom = otherTop + otherHeight;

      const widthCandidates = [
        otherWidth,
        otherRight - xReference,
        otherLeft - xReference,
        otherRight,
        otherLeft
      ].filter(candidate => candidate > this.minPanelWidth);

      const heightCandidates = [
        otherHeight,
        otherBottom - yReference,
        otherTop - yReference,
        otherBottom,
        otherTop
      ].filter(candidate => candidate > this.minPanelHeight);

      widthCandidates.forEach(candidate => {
        if (Math.abs(candidate - baseWidth) <= snapDistance) {
          width = candidate;
        }
      });

      heightCandidates.forEach(candidate => {
        if (Math.abs(candidate - baseHeight) <= snapDistance) {
          height = candidate;
        }
      });
    });

    panel.widthPx = Math.max(this.minPanelWidth, width);
    panel.heightPx = Math.max(this.minPanelHeight, height);
  }

private async saveDashboard(): Promise<void> {
  const user = this.auth.currentUser;
  if (!user) return;

  await setDoc(doc(db, 'hokuszpokLayouts', user.uid), {
    panels: this.panels,
    nextPanelId: this.nextPanelId,
    updatedAt: serverTimestamp()
  });
}

private async loadDashboard(userId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'hokuszpokLayouts', userId));
  if (!snap.exists()) return;

  const data = snap.data();

  if (data['panels']) {
    this.panels = data['panels'];
  } else if (data['rows']) {
    const legacyPanels = (data['rows'] as Array<{ panels: PanelItem[] }>).reduce(
      (allPanels: PanelItem[], row: { panels: PanelItem[] }) => allPanels.concat(row.panels), []
    );
    this.panels = legacyPanels.map((panel: PanelItem, index: number) => ({
      ...panel, x: panel.x ?? (index % 3) * 280 + 24, y: panel.y ?? Math.floor(index / 3) * 360 + 24
    }));
  }

  if (data['nextPanelId']) {
    this.nextPanelId = data['nextPanelId'];
  }

  this.normalizePanels();
  await this.saveDashboard();
}

private resetDashboardState(): void {
  this.activeListIndex = null;
  this.nextPanelId = 2;
  this.nextZIndex = 2;
  this.panels = [this.createPanel(1, 24, 24)];
}
}