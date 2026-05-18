import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild
} from '@angular/core';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from 'src/app/player/firebase-config';
import { AuthService } from 'src/app/player/auth.service';
import { ProfileFileWidgetComponent } from 'src/app/widget/profile-file-widget/profile-file-widget.component';
interface PanelItem {
  id: number;
  widget: string | null;
  widthPx?: number;
}

interface RowItem {
  id: number;
  panels: PanelItem[];
  heightPx?: number;
}

@Component({
  selector: 'app-hokuszpok',
  templateUrl: './hokuszpok.component.html',
  styleUrls: ['./hokuszpok.component.css']
})
export class HokuszpokComponent implements AfterViewInit {
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

  public rows: RowItem[] = [
    {
      id: 1,
      panels: [{ id: 1, widget: null }]
    }
  ];

  private nextPanelId = 2;
  private nextRowId = 2;

  private readonly maxPanelsPerRow = 3;
  private readonly minPanelWidth = 80;
  private readonly minRowHeight = 220;
  private readonly defaultRowHeight = 320;
  private readonly rowResizerHeight = 8;

  private isColDragging = false;
  private colStartX = 0;
  private prevPanelRef: PanelItem | null = null;
  private nextPanelRef: PanelItem | null = null;
  private prevStartWidth = 0;
  private nextStartWidth = 0;

  private isRowDragging = false;
  private rowStartY = 0;
  private dragRowIndex = -1;
  private prevRowStartHeight = 0;
  private nextRowStartHeight = 0;

  async ngAfterViewInit(): Promise<void> {
  await this.loadDashboard();

  this.redistributeAllWidths();
  this.ensureRowHeights();
  this.fitRowsToViewportIfNeeded();

    window.addEventListener('mousemove', (e: MouseEvent) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.stopDragging());
    window.addEventListener('resize', () => {
      this.redistributeAllWidths();
      this.fitRowsToViewportIfNeeded();
    });
  }

  public trackByRowId(_: number, row: RowItem): number {
    return row.id;
  }

  public trackByPanelId(_: number, panel: PanelItem): number {
    return panel.id;
  }

  public addPanel(): void {
    const lastRow = this.rows[this.rows.length - 1];

    if (lastRow.panels.length < this.maxPanelsPerRow) {
      lastRow.panels.push({ id: this.nextPanelId++, widget: null });
      this.redistributeRowWidths(lastRow);
    } else {
      this.rows.push({
        id: this.nextRowId++,
        panels: [{ id: this.nextPanelId++, widget: null }],
        heightPx: this.defaultRowHeight
      });

      this.ensureRowHeights();
      this.fitRowsToViewportIfNeeded();
      this.redistributeRowWidths(this.rows[this.rows.length - 1]);
    }
     this.saveDashboard();
  }
clearAllPanels(): void {
  this.activeListIndex = null;

  this.rows = [
    {
      id: this.nextRowId++,
      panels: [
        {
          id: this.nextPanelId++,
          widget: null
        }
      ],
      heightPx: this.defaultRowHeight
    }
  ];

  setTimeout(() => {
    this.ensureRowHeights();
    this.fitRowsToViewportIfNeeded();
    this.redistributeAllWidths();
    this.saveDashboard();
  });
}
  public removePanel(panelId: number): void {
    const rowIndex = this.rows.findIndex(row => row.panels.some(panel => panel.id === panelId));
    if (rowIndex === -1) return;

    const row = this.rows[rowIndex];
    row.panels = row.panels.filter(panel => panel.id !== panelId);

    if (this.activeListIndex === panelId) {
      this.activeListIndex = null;
    }

    if (row.panels.length === 0 && this.rows.length > 1) {
  this.rows.splice(rowIndex, 1);
  this.fitRowsToViewportIfNeeded();
  this.saveDashboard();
  return;
}

    if (row.panels.length === 0) {
      row.panels = [{ id: this.nextPanelId++, widget: null }];
    }

    this.redistributeRowWidths(row);
    this.fitRowsToViewportIfNeeded();
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

  public startColResize(event: MouseEvent, row: RowItem, index: number): void {
    if (index >= row.panels.length - 1) return;

    event.preventDefault();

    const prev = row.panels[index];
    const next = row.panels[index + 1];

    this.isColDragging = true;
    this.colStartX = event.clientX;
    this.prevPanelRef = prev;
    this.nextPanelRef = next;
    this.prevStartWidth = prev.widthPx ?? 0;
    this.nextStartWidth = next.widthPx ?? 0;

    document.body.classList.add('resizing-col');
  }

  public startRowResize(event: MouseEvent, index: number): void {
    if (index >= this.rows.length - 1) return;

    event.preventDefault();

    this.ensureRowHeights();

    this.isRowDragging = true;
    this.rowStartY = event.clientY;
    this.dragRowIndex = index;
    this.prevRowStartHeight = this.rows[index].heightPx ?? this.defaultRowHeight;
    this.nextRowStartHeight = this.rows[index + 1].heightPx ?? this.defaultRowHeight;

    document.body.classList.add('resizing-row');
  }

  public getGridTemplateRows(): string {
    return this.rows
      .map((row, index) => {
        const parts = [`${row.heightPx ?? this.defaultRowHeight}px`];
        if (index < this.rows.length - 1) {
          parts.push(`${this.rowResizerHeight}px`);
        }
        return parts.join(' ');
      })
      .join(' ');
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isColDragging && this.prevPanelRef && this.nextPanelRef) {
      const dx = event.clientX - this.colStartX;
      const newPrevWidth = this.prevStartWidth + dx;
      const newNextWidth = this.nextStartWidth - dx;

      if (newPrevWidth >= this.minPanelWidth && newNextWidth >= this.minPanelWidth) {
        this.prevPanelRef.widthPx = newPrevWidth;
        this.nextPanelRef.widthPx = newNextWidth;
      }
    }

    if (this.isRowDragging && this.dragRowIndex > -1) {
      const dy = event.clientY - this.rowStartY;
      const newPrevHeight = this.prevRowStartHeight + dy;
      const newNextHeight = this.nextRowStartHeight - dy;

      if (newPrevHeight >= this.minRowHeight && newNextHeight >= this.minRowHeight) {
        this.rows[this.dragRowIndex].heightPx = newPrevHeight;
        this.rows[this.dragRowIndex + 1].heightPx = newNextHeight;
      }
    }
  }

  private stopDragging(): void {
    this.isColDragging = false;
    this.isRowDragging = false;
    this.dragRowIndex = -1;
    this.prevPanelRef = null;
    this.nextPanelRef = null;
    document.body.classList.remove('resizing-col', 'resizing-row');
    this.saveDashboard();
    
  }

  private findPanel(panelId: number): PanelItem | null {
    for (const row of this.rows) {
      const panel = row.panels.find(item => item.id === panelId);
      if (panel) return panel;
    }

    return null;
  }

  private redistributeAllWidths(): void {
    this.rows.forEach(row => this.redistributeRowWidths(row));
  }

 private redistributeRowWidths(row: RowItem): void {
  setTimeout(() => {
    const container = this.containerRef?.nativeElement;
    if (!container) return;

    const rowEl = container.querySelector(`[data-row-id="${row.id}"]`) as HTMLElement | null;
    if (!rowEl) return;

    const resizersWidth = (row.panels.length - 1) * this.rowResizerHeight;
const availableWidth = Math.max(0, rowEl.clientWidth - resizersWidth);

if (availableWidth <= 0) {
  return;
}

const panelWidth = availableWidth / row.panels.length;

    row.panels.forEach(panel => {
      panel.widthPx = panelWidth;
    });
  });
}

  private ensureRowHeights(): void {
    this.rows.forEach(row => {
      if (!row.heightPx || row.heightPx < this.minRowHeight) {
        row.heightPx = this.defaultRowHeight;
      }
    });
  }

  private fitRowsToViewportIfNeeded(): void {
    setTimeout(() => {
      const container = this.containerRef?.nativeElement;
      if (!container) return;

      this.ensureRowHeights();

      const viewportHeight = container.parentElement?.clientHeight ?? container.clientHeight;
      const totalResizers = Math.max(0, this.rows.length - 1) * this.rowResizerHeight;
      const totalCurrentRowsHeight = this.rows.reduce(
        (sum, row) => sum + (row.heightPx ?? this.defaultRowHeight),
        0
      );

      const totalNeededHeight = totalCurrentRowsHeight + totalResizers;

      if (totalNeededHeight >= viewportHeight) {
        return;
      }

      const freeSpace = viewportHeight - totalNeededHeight;
      const extraPerRow = freeSpace / this.rows.length;

      this.rows.forEach(row => {
        row.heightPx = (row.heightPx ?? this.defaultRowHeight) + extraPerRow;
      });
    });
  }
private async saveDashboard(): Promise<void> {
  const user = this.auth.currentUser;
  if (!user) return;

  await setDoc(doc(db, 'hokuszpokLayouts', user.uid), {
    rows: this.rows,
    nextPanelId: this.nextPanelId,
    nextRowId: this.nextRowId,
    updatedAt: serverTimestamp()
  });
}

private async loadDashboard(): Promise<void> {
  const user = this.auth.currentUser;
  if (!user) return;

  const snap = await getDoc(doc(db, 'hokuszpokLayouts', user.uid));
  if (!snap.exists()) return;

  const data = snap.data();

  if (data['rows']) {
    this.rows = data['rows'];
  }

  if (data['nextPanelId']) {
    this.nextPanelId = data['nextPanelId'];
  }

  if (data['nextRowId']) {
    this.nextRowId = data['nextRowId'];
  }
}
}