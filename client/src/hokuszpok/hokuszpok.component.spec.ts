import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild
} from '@angular/core';

@Component({
  selector: 'app-hokuszpok',
  templateUrl: './hokuszpok.component.html',
  styleUrls: ['./hokuszpok.component.css']
})
export class HokuszpokComponent implements AfterViewInit {

  @ViewChild('hokuszContainer', { static: true })
  containerRef!: ElementRef<HTMLDivElement>;

  // vízszintes (oszlop) resize
  private isColDragging = false;
  private colStartX = 0;
  private prevSegment: HTMLElement | null = null;
  private nextSegment: HTMLElement | null = null;
  private prevStartWidth = 0;
  private nextStartWidth = 0;

  // függőleges (sor) resize – CSAK a két nagy row-wrapper között
  private isRowDragging = false;
  private rowStartY = 0;
  private containerTop = 0;
  private containerHeight = 0;
  private rowResizerHeight = 8;
  private readonly minRowHeight = 80;

  ngAfterViewInit(): void {
    this.updateContainerMetrics();
    this.initGridRows();
    this.initSegmentWidths();
    this.setupColResizers();
    this.setupRowResizer();

    window.addEventListener('resize', () => {
      this.updateContainerMetrics();
      this.initGridRows();
      this.initSegmentWidths();
    });
  }

  /* ---------- konténer méretek ---------- */

  private updateContainerMetrics(): void {
    const container = this.containerRef.nativeElement;
    const rect = container.getBoundingClientRect();
    this.containerTop = rect.top;
    this.containerHeight = rect.height;

    const rowResizer = container.querySelector('.row-resizer') as HTMLElement | null;
    this.rowResizerHeight = rowResizer ? rowResizer.offsetHeight : 8;
  }

  /* ---------- grid sorok kezdeti beállítása (50–50%) ---------- */

  private initGridRows(): void {
    const container = this.containerRef.nativeElement;

    const available = this.containerHeight - this.rowResizerHeight;
    const half = available / 2;

    // két nagy blokk + középen a resizer
    container.style.gridTemplateRows = `${half}px ${this.rowResizerHeight}px ${half}px`;
  }

  /* ---------- vízszintes panelek (3-3 egy sorban) ---------- */

  private initSegmentWidths(): void {
    const container = this.containerRef.nativeElement;
    const rows = Array.from(container.querySelectorAll('.hokusz-row')) as HTMLElement[];

    rows.forEach(row => {
      const segments = Array.from(row.querySelectorAll('.segment')) as HTMLElement[];
      if (!segments.length) return;

      const rowRect = row.getBoundingClientRect();
      const totalWidth = rowRect.width;

      const marginPerSegment = 8;
      const marginTotal = marginPerSegment * (segments.length - 1);

      const segmentWidth = (totalWidth - marginTotal) / segments.length;

      segments.forEach(seg => {
        seg.style.flex = `0 0 ${segmentWidth}px`;
      });
    });
  }

  private setupColResizers(): void {
    const container = this.containerRef.nativeElement;
    const resizers = Array.from(container.querySelectorAll('.resizer')) as HTMLElement[];

    resizers.forEach(resizer => {
      resizer.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        this.startColDragging(e, resizer);
      });
    });

    // globális egér események – mindkét irány használja
    window.addEventListener('mousemove', (e: MouseEvent) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.stopDragging());
  }

  private startColDragging(e: MouseEvent, resizer: HTMLElement): void {
    this.isColDragging = true;
    document.body.classList.add('resizing');

    this.colStartX = e.clientX;

    const row = resizer.closest('.hokusz-row') as HTMLElement | null;
    const parentSegment = resizer.closest('.segment') as HTMLElement | null;

    if (!row || !parentSegment || !parentSegment.classList.contains('segment')) {
      this.isColDragging = false;
      document.body.classList.remove('resizing');
      return;
    }

    const segments = Array.from(row.querySelectorAll('.segment')) as HTMLElement[];
    const idx = segments.indexOf(parentSegment);

    // utolsó segment után nincs jobb oldali pár
    if (idx === -1 || idx === segments.length - 1) {
      this.isColDragging = false;
      document.body.classList.remove('resizing');
      return;
    }

    this.prevSegment = parentSegment;
    this.nextSegment = segments[idx + 1];

    const prevRect = this.prevSegment.getBoundingClientRect();
    const nextRect = this.nextSegment.getBoundingClientRect();

    this.prevStartWidth = prevRect.width;
    this.nextStartWidth = nextRect.width;
  }

  /* ---------- függőleges resize a két sor között (grid sorok állítása) ---------- */

  private setupRowResizer(): void {
    const container = this.containerRef.nativeElement;
    const rowResizer = container.querySelector('.row-resizer') as HTMLElement | null;

    if (!rowResizer) return;

    rowResizer.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault();
      this.startRowDragging(e);
    });
  }

  private startRowDragging(e: MouseEvent): void {
    this.isRowDragging = true;
    document.body.classList.add('resizing');
    this.rowStartY = e.clientY;

    // biztos, ami biztos: frissítsük a konténer méretét húzás kezdetekor
    this.updateContainerMetrics();
  }

  /* ---------- egérmozgás – mindkét irányt kezeli ---------- */

  private onMouseMove(e: MouseEvent): void {
    const minWidth = 80;

    // vízszintes drag (oszlopok)
    if (this.isColDragging && this.prevSegment && this.nextSegment) {
      const dx = e.clientX - this.colStartX;

      const newPrevWidth = this.prevStartWidth + dx;
      const newNextWidth = this.nextStartWidth - dx;

      if (newPrevWidth >= minWidth && newNextWidth >= minWidth) {
        this.prevSegment.style.flex = `0 0 ${newPrevWidth}px`;
        this.nextSegment.style.flex = `0 0 ${newNextWidth}px`;
      }
    }

    // függőleges drag (csak a két nagy row-wrapper között)
    if (this.isRowDragging) {
      const container = this.containerRef.nativeElement;
      const cursorY = e.clientY;

      // egér pozíciója a konténer tetejéhez képest
      let newTopHeight = cursorY - this.containerTop;

      // min/max korlátok
      const minH = this.minRowHeight;
      const maxTop = this.containerHeight - this.rowResizerHeight - minH;

      if (newTopHeight < minH) newTopHeight = minH;
      if (newTopHeight > maxTop) newTopHeight = maxTop;

      const bottomHeight = this.containerHeight - this.rowResizerHeight - newTopHeight;

      // grid sorainak beállítása: felső blokk, resizer, alsó blokk
      container.style.gridTemplateRows =
        `${newTopHeight}px ${this.rowResizerHeight}px ${bottomHeight}px`;
    }
  }

  private stopDragging(): void {
    if (!this.isColDragging && !this.isRowDragging) return;

    this.isColDragging = false;
    this.isRowDragging = false;
    document.body.classList.remove('resizing');

    this.prevSegment = null;
    this.nextSegment = null;
  }
}
