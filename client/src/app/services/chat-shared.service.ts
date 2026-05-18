import { Injectable, NgZone } from '@angular/core';
import { onAuthStateChanged, Unsubscribe as AuthUnsubscribe, User } from 'firebase/auth';
import { auth } from '../player/firebase-config';
import { ChatService, Conversation, ChatMessage, UserResult } from '../chat/chat.service';

@Injectable({
  providedIn: 'root'
})
export class ChatSharedService {
    private static cachedUid = '';
  private static cachedConversations: Conversation[] = [];
  private static cachedConversationTitles: Record<string, string> = {};
  private static cachedFriends: UserResult[] = [];
  private static cachedIncomingRequests: any[] = [];
  private static cachedUnreadTotal = 0;
  private static cachedUserProfileCache: Record<string, UserResult & { profilePhotoUrl?: string; displayName?: string }> = {};
  meUid = '';
  conversations: Conversation[] = [];
  conversationTitles: Record<string, string> = {};
  friends: UserResult[] = [];
  incomingRequests: any[] = [];
  unreadTotal = 0;

  searchTerm = '';
  results: UserResult[] = [];

  selectedConvId: string | null = null;
  selectedConvData: Conversation | null = null;
  messages: ChatMessage[] = [];
  newMessage = '';
  error = '';

  imagePreviewUrl: string | null = null;
  canMessageSelectedConversation = true;

  activeGroupMembers: UserResult[] = [];
  addableGroupMembers: UserResult[] = [];
  selectedToAddToGroup: string[] = [];

  private pageUnsubs: (() => void)[] = [];
  private messagesUnsub: (() => void) | null = null;
  private authUnsub: AuthUnsubscribe | null = null;

  private readonly lastConversationStorageKey = 'chat_selected_conversation_id';
userProfileCache: Record<string, UserResult & { profilePhotoUrl?: string; displayName?: string }> = {};
  constructor(
    private chat: ChatService,
    private zone: NgZone
  ) {}

  init(): void {
  this.applyCachedState();

  if (this.authUnsub) {
    return;
  }

  this.authUnsub = onAuthStateChanged(auth, (user) => {
    this.zone.run(() => {
      this.handleAuthState(user);
    });
  });
}
private applyCachedState(): void {
  const currentUid = auth.currentUser?.uid || '';

  if (!currentUid || ChatSharedService.cachedUid !== currentUid) {
    return;
  }

  this.meUid = ChatSharedService.cachedUid;
  this.conversations = [...ChatSharedService.cachedConversations];
  this.conversationTitles = { ...ChatSharedService.cachedConversationTitles };
  this.friends = [...ChatSharedService.cachedFriends];
  this.incomingRequests = [...ChatSharedService.cachedIncomingRequests];
  this.unreadTotal = ChatSharedService.cachedUnreadTotal;
  this.userProfileCache = { ...ChatSharedService.cachedUserProfileCache };
}

  destroy(): void {
    this.cleanupPageListeners();
    this.cleanupMessageListener();

    if (this.authUnsub) {
      this.authUnsub();
      this.authUnsub = null;
    }
  }

  private handleAuthState(user: User | null): void {
    this.cleanupPageListeners();
    this.cleanupMessageListener();

    if (!user) {
      this.resetStateForLoggedOutUser();
      this.canMessageSelectedConversation = true;
      return;
    }

    this.meUid = user.uid;
    this.error = '';
    ChatSharedService.cachedUid = user.uid;
this.applyCachedState();

    const savedConvId = this.getSavedConversationId();
    if (savedConvId) {
      this.selectedConvId = savedConvId;
    }

    const u1 = this.chat.listenMyConversations(this.meUid, async (items) => {
      this.conversations = items;
      ChatSharedService.cachedConversations = [...items];

      if (this.selectedConvId) {
        const selected = items.find((c) => c.id === this.selectedConvId) || null;
        this.selectedConvData = selected;

        if (!selected) {
          this.clearSelectedConversation();
        } else if (!this.messagesUnsub) {
          this.subscribeToMessages(this.selectedConvId);
        }
      }

      await this.resolveConversationTitles(items);

      if (this.selectedConvId) {
        this.selectedConvData =
          this.conversations.find((c) => c.id === this.selectedConvId) || null;
      }

      this.updateSelectedConversationPermission();
    });

    const u2 = this.chat.listenMyFriends(this.meUid, async (uids) => {
      const users = await Promise.all(
        uids.map((uid) => this.chat.getUserData(uid))
      );

      this.friends = users.filter(Boolean);
ChatSharedService.cachedFriends = [...this.friends];
      this.updateSelectedConversationPermission();
    });

    const u3 = this.chat.listenIncomingRequests(this.meUid, (reqs) => {
      this.incomingRequests = reqs;
ChatSharedService.cachedIncomingRequests = [...reqs];
    });

    const u4 = this.chat.listenUnreadTotal(this.meUid, (count) => {
      this.unreadTotal = count;
ChatSharedService.cachedUnreadTotal = count;
    });

    this.pageUnsubs = [u1, u2, u3, u4];
  }

  private resetStateForLoggedOutUser(): void {
    this.meUid = '';
    this.error = 'Chathez be kell jelentkezni.';
    this.conversations = [];
    this.conversationTitles = {};
    this.friends = [];
    this.incomingRequests = [];
    this.unreadTotal = 0;
    this.results = [];
    this.searchTerm = '';
    this.newMessage = '';
    this.imagePreviewUrl = null;
    this.activeGroupMembers = [];
    this.addableGroupMembers = [];
    this.selectedToAddToGroup = [];
    this.clearSelectedConversation();
  }

  async onSearchChange(): Promise<void> {
    this.results = await this.chat.searchUsers(this.searchTerm);
  }

  async sendFriendRequest(user: UserResult): Promise<void> {
    if (this.isAlreadyFriend(user)) {
      return;
    }

    await this.chat.sendFriendRequest(user.uid);
    this.searchTerm = '';
    this.results = [];
  }

  async acceptFriend(requestId: string): Promise<void> {
    await this.chat.acceptRequest(requestId);
  }

  async startChatWithFriend(friend: UserResult): Promise<void> {
    const convId = await this.chat.getOrCreateConversation(friend.uid);
    this.openConversation(convId);
  }

  async unfriend(friend: UserResult): Promise<void> {
    await this.chat.removeFriend(friend.uid);
    this.updateSelectedConversationPermission();
  }

  openConversation(convId: string): void {
    this.selectedConvId = convId;
    this.selectedConvData =
      this.conversations.find((c) => c.id === convId) || null;

    this.updateSelectedConversationPermission();
    this.saveConversationId(convId);
    this.subscribeToMessages(convId);
  }

 private subscribeToMessages(convId: string): void {
  this.messages = [];
  this.cleanupMessageListener();

  this.messagesUnsub = this.chat.listenMessages(convId, (msgs) => {
    this.hydrateMessageProfiles(msgs).then(hydrated => {
      this.zone.run(() => {
        this.messages = hydrated;
      });

      this.scrollToBottom();
    });

    this.chat.markConversationAsRead(convId).catch((error) => {
      console.error('markConversationAsRead hiba:', error);
    });
  });
}

  async send(): Promise<void> {
    const text = this.newMessage.trim();

    if (!this.selectedConvId || !text || !this.canMessageSelectedConversation) {
      return;
    }

    await this.chat.sendMessage(this.selectedConvId, text);
    this.newMessage = '';
  }

  async uploadImage(file: File): Promise<void> {
    if (!file || !this.selectedConvId || !this.canMessageSelectedConversation) {
      return;
    }

    await this.chat.sendImageMessage(this.selectedConvId, file);
  }

  openImagePreview(imageUrl: string): void {
    this.imagePreviewUrl = imageUrl;
  }

  closeImagePreview(): void {
    this.imagePreviewUrl = null;
  }

  async deleteChat(c: Conversation): Promise<void> {
    await this.chat.deleteConversation(c.id);

    if (this.selectedConvId === c.id) {
      this.clearSelectedConversation();
      this.cleanupMessageListener();
    }
  }

  async leaveSelectedGroup(): Promise<void> {
    if (!this.selectedConvData || this.selectedConvData.type !== 'group') {
      return;
    }

    await this.chat.leaveGroup(this.selectedConvData.id);
    this.clearSelectedConversation();
    this.cleanupMessageListener();
    this.clearManageMembersState();
  }

  async refreshManageMembersData(): Promise<void> {
    if (!this.selectedConvData || this.selectedConvData.type !== 'group') {
      this.clearManageMembersState();
      return;
    }

    const removed = this.selectedConvData.removedMembers || [];
    const activeUids = (this.selectedConvData.participants || []).filter(
      (uid) => !removed.includes(uid)
    );

    const members = await Promise.all(
      activeUids.map((uid) => this.chat.getUserData(uid))
    );

    this.activeGroupMembers = members.filter(Boolean);

    const activeUidSet = new Set(activeUids);
    this.addableGroupMembers = this.friends.filter(
      (friend) => !activeUidSet.has(friend.uid)
    );

    this.selectedToAddToGroup = this.selectedToAddToGroup.filter((uid) =>
      this.addableGroupMembers.some((friend) => friend.uid === uid)
    );
  }

  toggleAddableMember(uid: string): void {
    const idx = this.selectedToAddToGroup.indexOf(uid);

    if (idx > -1) {
      this.selectedToAddToGroup.splice(idx, 1);
    } else {
      this.selectedToAddToGroup.push(uid);
    }
  }

  async addSelectedMembersToGroup(): Promise<void> {
    if (!this.selectedConvData || this.selectedConvData.type !== 'group') {
      return;
    }

    if (this.selectedToAddToGroup.length === 0) {
      return;
    }

    await this.chat.addGroupMembers(
      this.selectedConvData.id,
      this.selectedToAddToGroup
    );

    this.selectedToAddToGroup = [];
    await this.refreshManageMembersData();
  }

  async kickGroupMember(member: UserResult): Promise<void> {
    if (!this.selectedConvData || this.selectedConvData.type !== 'group') {
      return;
    }

    await this.chat.removeGroupMember(this.selectedConvData.id, member.uid);
    await this.refreshManageMembersData();
  }
  async hydrateMessageProfiles(messages: ChatMessage[]): Promise<ChatMessage[]> {
  const missingUids = [...new Set(
    messages
      .map(m => m.senderId)
      .filter(uid => uid && !this.userProfileCache[uid])
  )];

  for (const uid of missingUids) {
    try {
      this.userProfileCache[uid] = await this.chat.getUserData(uid);
    } catch {
      this.userProfileCache[uid] = {
        uid,
        username: 'Felhasználó',
        displayName: 'Felhasználó',
        profilePhotoUrl: ''
      };
    }
  }
ChatSharedService.cachedUserProfileCache = { ...this.userProfileCache };
  return messages.map(m => {
    const profile = this.userProfileCache[m.senderId];

    return {
      ...m,
      senderName:
        m.senderName ||
        profile?.username ||
        profile?.displayName ||
        'Felhasználó',

      senderPhotoUrl:
        m.senderPhotoUrl ||
        profile?.profilePhotoUrl ||
        ''
    };
  });
}

getMessageSenderName(m: ChatMessage): string {
  return m.senderName || this.userProfileCache[m.senderId]?.username || 'Felhasználó';
}

getMessageSenderPhoto(m: ChatMessage): string {
  return m.senderPhotoUrl || this.userProfileCache[m.senderId]?.profilePhotoUrl || '';
}

  private async resolveConversationTitles(items: Conversation[]): Promise<void> {
    const nextTitles: Record<string, string> = {};

    for (const conv of items) {
      if (conv.type === 'group') {
        nextTitles[conv.id] = conv.name || 'Névtelen csoport';
        continue;
      }

      const otherUid = (conv.participants || []).find((uid) => uid !== this.meUid);

      if (!otherUid) {
        nextTitles[conv.id] = 'Privát beszélgetés';
        continue;
      }

      try {
        const otherUser = await this.chat.getUserData(otherUid);
        nextTitles[conv.id] = otherUser.username || 'Ismeretlen felhasználó';
      } catch {
        nextTitles[conv.id] = 'Ismeretlen felhasználó';
      }
    }

    this.conversationTitles = nextTitles;
ChatSharedService.cachedConversationTitles = { ...nextTitles };
  }

  getConversationTitle(c: Conversation | null): string {
    if (!c) {
      return 'Beszélgetés';
    }

    return this.conversationTitles[c.id] || c.name || 'Privát beszélgetés';
  }

  getConversationUnreadCount(c: Conversation): number {
    return c.unreadBy?.[this.meUid] || 0;
  }

  getOtherParticipantUid(c: Conversation | null): string | null {
    if (!c || c.type !== 'private') {
      return null;
    }

    return (c.participants || []).find((uid) => uid !== this.meUid) || null;
  }

  isFriendByUid(uid: string | null): boolean {
    if (!uid) {
      return false;
    }

    return this.friends.some((friend) => friend.uid === uid);
  }

  isSelectedGroupOwner(): boolean {
    return !!this.selectedConvData &&
      this.selectedConvData.type === 'group' &&
      this.selectedConvData.ownerId === this.meUid;
  }

  isRemovedFromSelectedGroup(): boolean {
    if (!this.selectedConvData || this.selectedConvData.type !== 'group') {
      return false;
    }

    return (this.selectedConvData.removedMembers || []).includes(this.meUid);
  }

  updateSelectedConversationPermission(): void {
    if (!this.selectedConvData) {
      this.canMessageSelectedConversation = true;
      return;
    }

    if (this.selectedConvData.type === 'group') {
      this.canMessageSelectedConversation = !this.isRemovedFromSelectedGroup();
      return;
    }

    const otherUid = this.getOtherParticipantUid(this.selectedConvData);
    this.canMessageSelectedConversation = this.isFriendByUid(otherUid);
  }

  getSelectedConversationBlockedMessage(): string {
    if (!this.selectedConvData) {
      return '';
    }

    if (this.selectedConvData.type === 'group' && this.isRemovedFromSelectedGroup()) {
      return 'Már nem vagy a csoport tagja.';
    }

    if (this.selectedConvData.type === 'private' && !this.canMessageSelectedConversation) {
      return 'Már nem vagytok barátok.';
    }

    return '';
  }

  isAlreadyFriend(user: UserResult): boolean {
    return this.friends.some((friend) => friend.uid === user.uid);
  }

  isMine(m: ChatMessage): boolean {
    return m.senderId === this.meUid;
  }

  clearManageMembersState(): void {
    this.activeGroupMembers = [];
    this.addableGroupMembers = [];
    this.selectedToAddToGroup = [];
  }

  private clearSelectedConversation(): void {
    this.selectedConvId = null;
    this.selectedConvData = null;
    this.messages = [];
    this.removeSavedConversationId();
  }

  private cleanupPageListeners(): void {
    this.pageUnsubs.forEach((u) => u());
    this.pageUnsubs = [];
  }

  private cleanupMessageListener(): void {
    if (this.messagesUnsub) {
      this.messagesUnsub();
      this.messagesUnsub = null;
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const objDiv = document.querySelector('.msgs') as HTMLElement | null;
      if (objDiv) {
        objDiv.scrollTop = objDiv.scrollHeight;
      }
    }, 100);
  }

  private saveConversationId(convId: string): void {
    localStorage.setItem(this.lastConversationStorageKey, convId);
  }

  private getSavedConversationId(): string | null {
    return localStorage.getItem(this.lastConversationStorageKey);
  }

  private removeSavedConversationId(): void {
    localStorage.removeItem(this.lastConversationStorageKey);
  }
}