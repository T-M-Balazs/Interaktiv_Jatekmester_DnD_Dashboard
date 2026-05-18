import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClassesRacesComponent } from './classes-races.component';

describe('ClassesRacesComponent', () => {
  let component: ClassesRacesComponent;
  let fixture: ComponentFixture<ClassesRacesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClassesRacesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClassesRacesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
