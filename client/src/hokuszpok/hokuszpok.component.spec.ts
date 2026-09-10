import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HokuszpokComponent } from './hokuszpok.component';

describe('HokuszpokComponent', () => {
  let component: HokuszpokComponent;
  let fixture: ComponentFixture<HokuszpokComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HokuszpokComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HokuszpokComponent);
    component = fixture.componentInstance;
    component['containerRef'] = {
      nativeElement: {
        clientWidth: 1200,
        parentElement: { clientHeight: 900 }
      }
    } as any;
  });

  it('adds a new panel to the top-left stack instead of dropping it below the previous panel', () => {
    component.panels = [
      { id: 1, widget: null, x: 24, y: 24, widthPx: 260, heightPx: 220, zIndex: 1 }
    ];
    component['nextPanelId'] = 2;
    component['nextZIndex'] = 2;

    component.addPanel();

    expect(component.panels.length).toBe(2);
    expect(component.panels[1].x).toBe(24);
    expect(component.panels[1].y).toBeGreaterThan(24);
    expect(component.panels[1].zIndex).toBeGreaterThan(component.panels[0].zIndex ?? 0);
  });

  it('snaps a dragged panel to opposite edges and keeps resize snapping aligned with neighbors', () => {
    const first = { id: 1, widget: null, x: 150, y: 130, widthPx: 190, heightPx: 170, zIndex: 1 };
    const second = { id: 2, widget: null, x: 300, y: 220, widthPx: 200, heightPx: 180, zIndex: 2 };
    component.panels = [first, second];

    (component as any).applyMoveSnap(first);
    expect(first.x).toBe(140);
    expect(first.y).toBe(120);

    (component as any).applyResizeSnap(first);
    expect(first.widthPx).toBe(200);
    expect(first.heightPx).toBe(180);
  });
});
