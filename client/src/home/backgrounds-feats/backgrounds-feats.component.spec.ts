import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackgroundsFeatsComponent } from './backgrounds-feats.component';

describe('BackgroundsFeatsComponent', () => {
  let component: BackgroundsFeatsComponent;
  let fixture: ComponentFixture<BackgroundsFeatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BackgroundsFeatsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BackgroundsFeatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
