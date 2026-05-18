import { CommonModule } from '@angular/common';
import { Component, Input, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-monster-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './monster-editor.component.html',
  styleUrls: ['../../statblock.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class MonsterEditorComponent {
  @Input() parent!: any;
}