import { CommonModule } from '@angular/common';
import { Component, Input, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-item-spell-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './item-spell-editor.component.html',
  styleUrls: ['../../statblock.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class ItemSpellEditorComponent {
  @Input() parent!: any;
}