import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonsterEditorComponent } from './monster-editor.component';

describe('MonsterEditorComponent', () => {
  let component: MonsterEditorComponent;
  let fixture: ComponentFixture<MonsterEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonsterEditorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonsterEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
