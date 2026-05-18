import { Component, HostListener, OnInit } from '@angular/core';
import { UserResult } from '../../chat/chat.service';
import { ChatSharedService } from 'src/app/services/chat-shared.service';
@Component({
  selector: 'app-chat-widget',
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.css'],
  providers: [ChatSharedService]
})
export class ChatWidgetComponent implements OnInit {
  showEmojiPicker = false;

  emojis: string[] = [
    '😀', '😁', '😂', '🤣', '😊',
    '😍', '😘', '😎', '😢', '😭',
    '😡', '👍', '👎', '🙏', '👏',
    '🔥', '❤️', '💔', '🎉', '💬'
  ];

  constructor(public chatState: ChatSharedService) {}

  ngOnInit(): void {
    this.chatState.init();
  }

  async startChatWithFriend(friend: UserResult): Promise<void> {
    await this.chatState.startChatWithFriend(friend);
  }

  async send(): Promise<void> {
    try {
      await this.chatState.send();
    } catch (error: any) {
      console.error('Üzenetküldési hiba:', error);
      alert(error?.message || 'Nem sikerült az üzenetet elküldeni.');
    }
  }

  async uploadImage(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      await this.chatState.uploadImage(file);
    } catch (error: any) {
      console.error('Képfeltöltési hiba:', error);
      alert(error?.message || 'Nem sikerült a kép feltöltése.');
    } finally {
      input.value = '';
    }
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(emoji: string): void {
    this.chatState.newMessage += emoji;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (
      target.closest('.emoji-picker-wrap') ||
      target.closest('.emoji-btn')
    ) {
      return;
    }

    this.showEmojiPicker = false;
  }
}