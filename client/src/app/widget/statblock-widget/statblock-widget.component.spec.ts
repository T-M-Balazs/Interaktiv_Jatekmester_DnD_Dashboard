import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatblockWidgetComponent } from './statblock-widget.component';

describe('StatblockWidgetComponent', () => {
  let component: StatblockWidgetComponent;
  let fixture: ComponentFixture<StatblockWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StatblockWidgetComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatblockWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
