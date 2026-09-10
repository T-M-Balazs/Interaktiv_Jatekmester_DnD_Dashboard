import { Component, DoCheck, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ChatService, UserResult } from './chat.service';
import { ChatSharedService } from '../services/chat-shared.service';
import { VoiceCallService } from './voice-call.service';
import { auth } from '../player/firebase-config';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy, DoCheck {
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
  private incomingCallKey = '';
  private ignoredIncomingCallKey = '';
  private incomingCallCheckTimer: number | null = null;
  private waitingForAcceptedCallId = '';

  constructor(
    public chatState: ChatSharedService,
    private chat: ChatService,
    public voiceCall: VoiceCallService
  ) {}

  ngOnInit(): void {
    this.chatState.init();
    this.incomingCallCheckTimer = window.setInterval(() => this.syncIncomingCall(), 500);
  }

  ngOnDestroy(): void {
    if (this.incomingCallCheckTimer !== null) {
      window.clearInterval(this.incomingCallCheckTimer);
    }
    this.voiceCall.stopRinging();
    this.chatState.destroy();
  }

  ngDoCheck(): void {
    this.syncIncomingCall();
    this.syncEndedPrivateCall();
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

  async startVoiceCall(): Promise<void> {
    if (!this.chatState.selectedConvId) {
      return;
    }

    const conversation = this.chatState.selectedConvData;

    if (!conversation) {
      return;
    }

    const activeCall = conversation.call;

    try {
      await this.voiceCall.ensureMicrophoneAccess();

      if (conversation.type === 'private') {
        if (activeCall?.status === 'ringing') {
          return;
        }

        if (activeCall?.status === 'active' && activeCall.acceptedBy && this.isCallActive(conversation)) {
          await this.voiceCall.joinRoom(
            this.chatState.selectedConvId,
            await this.getCurrentUserName()
          );
          await this.chat.addCallParticipant(
            this.chatState.selectedConvId,
            this.chatState.meUid
          );
          await this.chat.markCallActiveIfReady(this.chatState.selectedConvId, 2);
          return;
        }

        const targetId = this.chatState.getOtherParticipantUid(conversation);
        if (!targetId) {
          return;
        }

        await this.chat.setConversationCallMeta(this.chatState.selectedConvId, {
          roomName: this.chatState.selectedConvId,
          callerId: this.chatState.meUid || 'unknown-user',
          callerName: await this.getCurrentUserName(),
          targetId,
          status: 'ringing'
        });
        this.voiceCall.startRinging();
        this.waitingForAcceptedCallId = this.chatState.selectedConvId;
        void this.waitForPrivateCallAccepted(this.chatState.selectedConvId);
        return;
      }

      await this.voiceCall.joinRoom(
        this.chatState.selectedConvId,
        await this.getCurrentUserName()
      );
      if (!activeCall || activeCall.status !== 'active') {
        await this.chat.setConversationCallMeta(this.chatState.selectedConvId, {
          roomName: this.chatState.selectedConvId,
          callerId: this.chatState.meUid || 'unknown-user',
          callerName: await this.getCurrentUserName(),
          status: 'ringing'
        });
      }
      await this.chat.addCallParticipant(
        this.chatState.selectedConvId,
        this.chatState.meUid
      );
      await this.chat.markCallActiveIfReady(this.chatState.selectedConvId, 1);
    } catch (error: any) {
      console.error('Voice call start failed:', error);
      alert(error?.message || 'A hanghívás indítása sikertelen.');
    }
  }

  async stopVoiceCall(): Promise<void> {
    if (!this.chatState.selectedConvId) {
      return;
    }

    try {
      this.waitingForAcceptedCallId = '';
      this.voiceCall.stopRinging();
      const conversation = this.chatState.selectedConvData;
      const keepGroupCallActive = conversation?.type === 'group' &&
        this.voiceCall.hasRemoteParticipants();

      if (conversation?.type === 'group') {
        this.ignoredIncomingCallKey = this.getCallKey(conversation);
        await this.chat.removeCallParticipant(
          this.chatState.selectedConvId,
          this.chatState.meUid
        );
        const updatedCall = await this.chat.getConversationCallMeta(
          this.chatState.selectedConvId
        );
        const participantIds = updatedCall?.participantIds;
        await this.voiceCall.leaveRoom();

        if ((participantIds && participantIds.length === 0) ||
            (!participantIds && !keepGroupCallActive)) {
          await this.chat.clearConversationCallMeta(this.chatState.selectedConvId);
        }
        return;
      }
      await this.voiceCall.leaveRoom();

      if (!keepGroupCallActive) {
        await this.chat.clearConversationCallMeta(this.chatState.selectedConvId);
      }
    } catch (error: any) {
      console.error('Voice call stop failed:', error);
      alert(error?.message || 'A hanghívás leállítása sikertelen.');
    }
  }

  async toggleVoiceMute(): Promise<void> {
    await this.voiceCall.toggleMute();
  }

  toggleRemoteMute(participant: { identity: string; muted: boolean }): void {
    this.voiceCall.setRemoteMuted(participant.identity, !participant.muted);
  }

  setRemoteVolume(participant: { identity: string }, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.voiceCall.setRemoteVolume(participant.identity, Number(input.value));
  }

  get incomingCall(): { conversationId: string; callerName: string } | null {
    const callConversation = this.chatState.conversations.find((conversation) =>
      this.getCallKey(conversation) !== this.ignoredIncomingCallKey &&
      conversation.call?.callerId !== this.chatState.meUid &&
      (
        (conversation.type === 'private' &&
          conversation.call?.status === 'ringing' &&
          conversation.call.targetId === this.chatState.meUid) ||
        (conversation.type === 'group' &&
          this.isCallActive(conversation) &&
          !this.voiceCall.isConnected)
      )
    );

    if (!callConversation) {
      return null;
    }

    return {
      conversationId: callConversation.id,
      callerName: callConversation.call?.callerName || 'Egy játékos'
    };
  }

  async acceptIncomingCall(): Promise<void> {
    const call = this.incomingCall;
    if (!call) {
      return;
    }

    try {
      await this.voiceCall.ensureMicrophoneAccess();
      this.voiceCall.stopRinging();
      this.chatState.openConversation(call.conversationId);
      const conversation = this.chatState.conversations.find(
        (item) => item.id === call.conversationId
      );
      if (conversation?.type === 'private') {
        await this.chat.setConversationCallMeta(call.conversationId, {
          ...conversation.call,
          roomName: conversation.call?.roomName || call.conversationId,
          status: 'ringing',
          acceptedBy: this.chatState.meUid || undefined
        });
      }
      this.ignoredIncomingCallKey = '';
      await this.voiceCall.joinRoom(
        call.conversationId,
        await this.getCurrentUserName()
      );
      if (conversation?.type === 'group') {
        await this.chat.addCallParticipant(call.conversationId, this.chatState.meUid);
        await this.chat.markCallActiveIfReady(call.conversationId, 1);
      } else {
        await this.chat.addCallParticipant(call.conversationId, this.chatState.meUid);
      }
    } catch (error: any) {
      console.error('Incoming voice call accept failed:', error);
      alert(error?.message || 'A hívás elfogadása sikertelen.');
    }
  }

  async rejectIncomingCall(): Promise<void> {
    const call = this.incomingCall;
    if (!call) {
      return;
    }

    this.voiceCall.stopRinging();
    this.ignoredIncomingCallKey = this.getCallKey(
      this.chatState.conversations.find((item) => item.id === call.conversationId)
    );
    const conversation = this.chatState.conversations.find(
      (item) => item.id === call.conversationId
    );
    if (conversation?.type === 'private') {
      await this.chat.rejectConversationCall(call.conversationId);
    }
  }

  private syncIncomingCall(): void {
    const call = this.incomingCall;
    const nextKey = call
      ? this.getCallKey(this.chatState.conversations.find((item) => item.id === call.conversationId))
      : '';

    if (nextKey === this.incomingCallKey) {
      return;
    }

    this.incomingCallKey = nextKey;
    if (call) {
      this.voiceCall.startRinging();
    } else {
      this.voiceCall.stopRinging();
    }
  }

  private getCallKey(conversation: any): string {
    if (!conversation?.call) {
      return '';
    }

    const startedAt = conversation.call.startedAt;
    const startedAtKey = startedAt?.seconds || startedAt?.toMillis?.() || startedAt || '';
    return `${conversation.id}:${conversation.call.callerId || ''}:${startedAtKey}`;
  }

  isCallActive(conversation: any): boolean {
    const call = conversation?.call;
    const participantCount = call?.participantIds?.length || 0;

    if (conversation?.type === 'private') {
      return call?.status === 'active' && participantCount >= 2;
    }

    return call?.status === 'active' && participantCount >= 1;
  }

  private syncEndedPrivateCall(): void {
    const conversationId = this.voiceCall.activeConversationId;
    if (!conversationId || !this.voiceCall.isConnected) {
      return;
    }

    const conversation = this.chatState.conversations.find(
      (item) => item.id === conversationId
    );

    if (conversation?.type === 'private' && !conversation.call) {
      this.waitingForAcceptedCallId = '';
      void this.voiceCall.leaveRoom();
    }
  }

  private async waitForPrivateCallAccepted(conversationId: string): Promise<void> {
    while (this.waitingForAcceptedCallId === conversationId) {
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
      const call = await this.chat.getConversationCallMeta(conversationId);

      if (!call || call.status !== 'ringing') {
        this.voiceCall.stopRinging();
      }

      if (!call || call.status === 'ended') {
        this.waitingForAcceptedCallId = '';
        return;
      }

      if (call.acceptedBy && (call.status === 'ringing' || call.status === 'active')) {
        this.waitingForAcceptedCallId = '';
        this.voiceCall.stopRinging();
        await this.voiceCall.joinRoom(
          conversationId,
          await this.getCurrentUserName()
        );
        await this.chat.addCallParticipant(conversationId, this.chatState.meUid);
        await this.chat.markCallActiveIfReady(conversationId, 2);
        return;
      }
    }
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

  private async getCurrentUserName(): Promise<string> {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      return 'Játékos';
    }

    try {
      const profile = await this.chat.getUserData(uid);
      return profile?.username || auth.currentUser?.displayName || 'Játékos';
    } catch {
      return auth.currentUser?.displayName || 'Játékos';
    }
  }
}