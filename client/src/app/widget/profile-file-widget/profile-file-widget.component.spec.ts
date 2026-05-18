import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileFileWidgetComponent } from './profile-file-widget.component';

describe('ProfileFileWidgetComponent', () => {
  let component: ProfileFileWidgetComponent;
  let fixture: ComponentFixture<ProfileFileWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProfileFileWidgetComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileFileWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
