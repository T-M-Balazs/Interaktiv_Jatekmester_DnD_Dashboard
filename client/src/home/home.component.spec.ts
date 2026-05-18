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

  // függőleges (sor) resize
  private isRowDragging = false;
  private rowStartY = 0;
  private prevRowWrapper: HTMLElement | null = null;
  private nextRowWrapper: HTMLElement | null = null;
  private prevRowStartHeight = 0;
  private nextRowStartHeight = 0;

  ngAfterViewInit(): void {
    this.initSegmentWidths();
    this.initRowHeights();
    this.setupResizers();
    this.setupRowResizers();

    window.addEventListener('resize', () => {
      this.initSegmentWidths();
      this.initRowHeights();
    });
  }

  // ➊ vízszintes panelek (3-3 egy sorban)
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

  // ➋ két sor (felső/alsó) magasságának alapértéke
  private initRowHeights(): void {
    const container = this.containerRef.nativeElement;
    const rowWrappers = Array.from(container.querySelectorAll('.row-wrapper')) as HTMLElement[];
    if (!rowWrappers.length) return;

    const containerRect = container.getBoundingClientRect();
    const totalHeight = containerRect.height;

    const gapBetweenRows = 10; // .hokusz-container gap: 10px
    const wrapperCount = rowWrappers.length;

    const wrapperHeight = (totalHeight - gapBetweenRows) / wrapperCount;

    rowWrappers.forEach(wrapper => {
      wrapper.style.flex = `0 0 ${wrapperHeight}px`;
    });
  }

  // ➌ vízszintes resizerek (oszlopok közt)
  private setupResizers(): void {
    const container = this.containerRef.nativeElement;
    const resizers = Array.from(container.querySelectorAll('.resizer')) as HTMLElement[];

    resizers.forEach(resizer => {
      resizer.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        this.startColDragging(e, resizer);
      });
    });

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

  // ➍ függőleges resizer (két sor közt)
  private setupRowResizers(): void {
    const container = this.containerRef.nativeElement;
    const rowResizers = Array.from(container.querySelectorAll('.row-resizer')) as HTMLElement[];

    rowResizers.forEach(resizer => {
      resizer.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        this.startRowDragging(e, resizer);
      });
    });
  }

  private startRowDragging(e: MouseEvent, resizer: HTMLElement): void {
    this.isRowDragging = true;
    document.body.classList.add('resizing');

    this.rowStartY = e.clientY;

    const wrapper = resizer.closest('.row-wrapper') as HTMLElement | null;

    if (!wrapper) {
      this.isRowDragging = false;
      document.body.classList.remove('resizing');
      return;
    }

    const container = this.containerRef.nativeElement;
    const wrappers = Array.from(container.querySelectorAll('.row-wrapper')) as HTMLElement[];
    const idx = wrappers.indexOf(wrapper);

    if (idx === -1 || idx === wrappers.length - 1) {
      this.isRowDragging = false;
      document.body.classList.remove('resizing');
      return;
    }

    this.prevRowWrapper = wrapper;
    this.nextRowWrapper = wrappers[idx + 1];

    const prevRect = this.prevRowWrapper.getBoundingClientRect();
    const nextRect = this.nextRowWrapper.getBoundingClientRect();

    this.prevRowStartHeight = prevRect.height;
    this.nextRowStartHeight = nextRect.height;
  }

  // ➎ egérmozgás – mindkét irányt kezeli
  private onMouseMove(e: MouseEvent): void {
    const minWidth = 80;
    const minHeight = 80;

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

    // függőleges drag (sorok)
    if (this.isRowDragging && this.prevRowWrapper && this.nextRowWrapper) {
      const dy = e.clientY - this.rowStartY;

      const newPrevHeight = this.prevRowStartHeight + dy;
      const newNextHeight = this.nextRowStartHeight - dy;

      if (newPrevHeight >= minHeight && newNextHeight >= minHeight) {
        this.prevRowWrapper.style.flex = `0 0 ${newPrevHeight}px`;
        this.nextRowWrapper.style.flex = `0 0 ${newNextHeight}px`;
      }
    }
  }

  private stopDragging(): void {
    if (!this.isColDragging && !this.isRowDragging) return;

    this.isColDragging = false;
    this.isRowDragging = false;
    document.body.classList.remove('resizing');

    this.prevSegment = null;
    this.nextSegment = null;
    this.prevRowWrapper = null;
    this.nextRowWrapper = null;
  }
}
