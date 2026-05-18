import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ChatService, UserResult } from './chat.service';
import { ChatSharedService } from '../services/chat-shared.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
  providers: [ChatSharedService]
})
export class ChatComponent implements OnInit, OnDestroy {
  activeTab: 'chats' | 'friends' = 'chats';
  showGroupModal = false;
  showManageMembersModal = false;

  showEmojiPicker = false;
  emojis: string[] = [
    '😀', '😁', '😂', '🤣', '😊',
    '😍', '😘', '😎', '😢', '😭',
    '😡', '👍', '👎', '🙏', '👏',
    '🔥', '❤️', '💔', '🎉', '💬'
  ];

  selectedForGroup: string[] = [];
  newGroupName = '';

  constructor(
    public chatState: ChatSharedService,
    private chat: ChatService
  ) {}

  ngOnInit(): void {
    this.chatState.init();
  }

  ngOnDestroy(): void {
    this.chatState.destroy();
  }

  async onSearchChange(): Promise<void> {
    await this.chatState.onSearchChange();
  }

  async sendFriendRequest(user: UserResult): Promise<void> {
    if (this.chatState.isAlreadyFriend(user)) {
      return;
    }

    await this.chatState.sendFriendRequest(user);
    alert('Barátkérés elküldve: ' + user.username);
  }

  async acceptFriend(requestId: string): Promise<void> {
    await this.chatState.acceptFriend(requestId);
  }

  toggleParticipant(uid: string): void {
    const idx = this.selectedForGroup.indexOf(uid);

    if (idx > -1) {
      this.selectedForGroup.splice(idx, 1);
    } else {
      this.selectedForGroup.push(uid);
    }
  }

  async createGroup(): Promise<void> {
    const groupName = this.newGroupName.trim();

    if (!groupName || this.selectedForGroup.length === 0) {
      return;
    }

    const gid = await this.chat.createGroup(groupName, this.selectedForGroup);

    this.showGroupModal = false;
    this.newGroupName = '';
    this.selectedForGroup = [];

    if (gid) {
      this.activeTab = 'chats';
      this.chatState.openConversation(gid);
    }
  }

  async startChatWithFriend(friend: UserResult): Promise<void> {
    this.activeTab = 'chats';
    await this.chatState.startChatWithFriend(friend);
  }

  async unfriend(friend: UserResult, event?: Event): Promise<void> {
    event?.stopPropagation();

    if (!confirm(`${friend.username} eltávolítása a barátok közül?`)) {
      return;
    }

    await this.chatState.unfriend(friend);
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

  closeEmojiPicker(): void {
    this.showEmojiPicker = false;
  }

  async deleteChat(c: any): Promise<void> {
    if (!confirm('Biztosan törlöd?')) {
      return;
    }

    await this.chatState.deleteChat(c);
  }

  async leaveSelectedGroup(): Promise<void> {
    if (!this.chatState.selectedConvData || this.chatState.selectedConvData.type !== 'group') {
      return;
    }

    if (!confirm('Biztosan elhagyod a csoportot?')) {
      return;
    }

    await this.chatState.leaveSelectedGroup();
    this.closeManageMembersModal();
  }

  async openManageMembersModal(): Promise<void> {
    if (
      !this.chatState.selectedConvData ||
      this.chatState.selectedConvData.type !== 'group' ||
      !this.chatState.isSelectedGroupOwner()
    ) {
      return;
    }

    await this.chatState.refreshManageMembersData();
    this.showManageMembersModal = true;
  }

  closeManageMembersModal(): void {
    this.showManageMembersModal = false;
    this.chatState.clearManageMembersState();
  }

  async addSelectedMembersToGroup(): Promise<void> {
    await this.chatState.addSelectedMembersToGroup();
  }

  async kickGroupMember(member: UserResult): Promise<void> {
    if (!confirm(`${member.username} eltávolítása a csoportból?`)) {
      return;
    }

    await this.chatState.kickGroupMember(member);
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