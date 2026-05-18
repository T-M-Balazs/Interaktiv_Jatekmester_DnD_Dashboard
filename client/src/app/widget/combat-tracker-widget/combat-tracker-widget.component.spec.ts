import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CombatTrackerWidgetComponent } from './combat-tracker-widget.component';

describe('CombatTrackerWidgetComponent', () => {
  let component: CombatTrackerWidgetComponent;
  let fixture: ComponentFixture<CombatTrackerWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CombatTrackerWidgetComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CombatTrackerWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
