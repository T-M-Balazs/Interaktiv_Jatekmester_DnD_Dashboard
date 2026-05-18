import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiceWidgetComponent } from './dice-widget.component';

describe('DiceWidgetComponent', () => {
  let component: DiceWidgetComponent;
  let fixture: ComponentFixture<DiceWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DiceWidgetComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiceWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
