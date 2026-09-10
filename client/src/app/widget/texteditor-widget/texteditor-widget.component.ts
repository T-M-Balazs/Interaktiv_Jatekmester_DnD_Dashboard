import { Component, OnInit, SecurityContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { auth, db } from '../../player/firebase-config';
import { 
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, 
  query, where, serverTimestamp 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

@Component({
  selector: 'app-texteditor-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './texteditor-widget.component.html',
  styleUrls: ['./texteditor-widget.component.css']
})
export class TexteditorWidgetComponent implements OnInit {
  title = '';
  content = '';
  characterCount = 0;
  currentUserId = '';
  selectedNoteId = ''; 
  savedNotes: any[] = []; 
  searchTerm = ''; 
  showResults = false;

  colors = ['#eeeeee', '#c9a84c', '#ef5350', '#4caf50', '#42a5f5', '#ab47bc', '#ffa726', '#26c6da'];
  selectedColor = '#eeeeee';
  private savedRange: Range | null = null;

  constructor(private sanitizer: DomSanitizer) {}

  async ngOnInit() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUserId = user.uid;
        await this.loadNotes();
      }
    });
  }

  get filteredNotes() {
    const term = this.searchTerm ? this.searchTerm.toLowerCase().trim() : '';
    if (!term) return this.savedNotes; 
    return this.savedNotes.filter(note => 
      note.title && note.title.toLowerCase().includes(term)
    );
  }

  async loadNotes() {
    if (!this.currentUserId) return;
    try {
      const q = query(collection(db, 'notes'), where('ownerId', '==', this.currentUserId));
      const snap = await getDocs(q);
      this.savedNotes = snap.docs.map(d => ({
        id: d.id, ...d.data()
      })).sort((a: any, b: any) => a.title.localeCompare(b.title));
    } catch (e) { console.error(e); }
  }

  hideResultsWithDelay() {
    setTimeout(() => { this.showResults = false; }, 250);
  }

  openNote(note: any) {
    this.selectedNoteId = note.id;
    this.title = note.title;
    this.content = this.sanitizeHtml(note.content || '');
    this.characterCount = note.characterCount || 0;
    const editor = this.getEditor();
    if (editor) editor.innerHTML = this.content;
    this.showResults = false;
  }

  createNew() {
    const editor = this.getEditor();
    if (editor) editor.innerHTML = '';
    this.title = ''; this.content = ''; this.characterCount = 0; this.selectedNoteId = '';
  }

  async saveText() {
    if (!this.currentUserId || !this.title.trim()) return;
    this.updateContentFromEditor();
    try {
      if (this.selectedNoteId) {
        await updateDoc(doc(db, 'notes', this.selectedNoteId), {
          title: this.title, content: this.content, characterCount: this.characterCount, updatedAt: serverTimestamp()
        });
      } else {
        const docRef = await addDoc(collection(db, 'notes'), {
          title: this.title, content: this.content, characterCount: this.characterCount,
          ownerId: this.currentUserId, createdAt: serverTimestamp()
        });
        this.selectedNoteId = docRef.id;
      }
      await this.loadNotes();
      alert("Mentve!");
    } catch (e) { console.error(e); }
  }

  async deleteCurrent() {
    if (!this.selectedNoteId || !confirm("Törlöd?")) return;
    await deleteDoc(doc(db, 'notes', this.selectedNoteId));
    await this.loadNotes();
    this.createNew();
  }

  format(command: string) {
    this.restoreSelection();
    document.execCommand(command, false);
    this.updateContentFromEditor();
  }

  changeColor(color: string) {
    this.selectedColor = color;
    this.restoreSelection();
    document.execCommand('foreColor', false, color);
    this.updateContentFromEditor();
  }

  onEditorInput(event: Event) {
    const el = event.target as HTMLElement;
    this.content = el.innerHTML;
    this.characterCount = el.innerText.length;
    this.saveSelection();
  }

  saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) this.savedRange = sel.getRangeAt(0).cloneRange();
  }

  restoreSelection() {
    const editor = this.getEditor();
    editor?.focus();
    if (this.savedRange) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(this.savedRange);
    }
  }

  private getEditor() { return document.querySelector('.editor-area') as HTMLElement; }
  private updateContentFromEditor() {
    const ed = this.getEditor();
    if (ed) {
      this.content = this.sanitizeHtml(ed.innerHTML);
      this.characterCount = ed.innerText.length;
    }
  }

  private sanitizeHtml(value: string): string {
    return this.sanitizer.sanitize(SecurityContext.HTML, value) || '';
  }
}