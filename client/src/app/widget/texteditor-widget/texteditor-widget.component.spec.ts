import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { TexteditorWidgetComponent } from './texteditor-widget.component';

describe('TexteditorWidgetComponent', () => {
  let component: TexteditorWidgetComponent;
  let fixture: ComponentFixture<TexteditorWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TexteditorWidgetComponent],
      imports: [FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TexteditorWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});