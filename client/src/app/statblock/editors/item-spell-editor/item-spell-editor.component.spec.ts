import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemSpellEditorComponent } from './item-spell-editor.component';

describe('ItemSpellEditorComponent', () => {
  let component: ItemSpellEditorComponent;
  let fixture: ComponentFixture<ItemSpellEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ItemSpellEditorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItemSpellEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
