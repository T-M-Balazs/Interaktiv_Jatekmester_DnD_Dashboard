import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SoundboardWidgetComponent } from './soundboard-widget.component';

describe('SoundboardWidgetComponent', () => {
  let component: SoundboardWidgetComponent;
  let fixture: ComponentFixture<SoundboardWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SoundboardWidgetComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SoundboardWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
