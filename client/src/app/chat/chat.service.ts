import { Injectable } from '@angular/core';
import { auth, db, storage } from '../player/firebase-config';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  startAt,
  endAt,
  getDocs,
  writeBatch,
  Unsubscribe,
  updateDoc,
  arrayRemove,
  arrayUnion
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';

export interface ConversationCall {
  roomName?: string;
  callerId?: string;
  callerName?: string;
  targetId?: string;
  acceptedBy?: string;
  participantIds?: string[];
  status?: 'ringing' | 'active' | 'ended';
  startedAt?: any;
  endedAt?: any;
}

export interface ProfilePhotoSettings {
  scale?: number;
  x?: number;
  y?: number;
}

export interface Conversation {
  id: string;
  participants: string[];
  type: 'private' | 'group';
  name?: string;
  ownerId?: string;
  lastMessage?: string;
  lastMessageAt?: any;
  hiddenFor?: string[];
  removedMembers?: string[];
  unreadBy?: Record<string, number>;
  call?: ConversationCall;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text?: string | null;
  imageUrl?: string | null;
  createdAt?: any;

  senderName?: string;
  senderPhotoUrl?: string;
  senderPhotoSettings?: ProfilePhotoSettings;
}

export interface UserResult {
  uid: string;
  username: string;
  displayName?: string;
  profilePhotoUrl?: string;
  profilePhotoSettings?: ProfilePhotoSettings;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  async setConversationCallMeta(convId: string, call: ConversationCall): Promise<void> {
    const convRef = doc(db, 'conversations', convId);

    await updateDoc(convRef, {
      call: {
        ...call,
        startedAt: call.startedAt ?? serverTimestamp(),
        status: call.status ?? 'active'
      }
    });
  }

  async clearConversationCallMeta(convId: string): Promise<void> {
    const convRef = doc(db, 'conversations', convId);
    await updateDoc(convRef, { call: null });
  }

  async rejectConversationCall(convId: string): Promise<void> {
    await this.clearConversationCallMeta(convId);
  }

  async addCallParticipant(convId: string, uid: string): Promise<void> {
    await updateDoc(doc(db, 'conversations', convId), {
      'call.participantIds': arrayUnion(uid)
    });
  }

  async markCallActiveIfReady(convId: string, requiredParticipants: number): Promise<void> {
    const call = await this.getConversationCallMeta(convId);
    if ((call?.participantIds?.length || 0) >= requiredParticipants) {
      await updateDoc(doc(db, 'conversations', convId), {
        'call.status': 'active'
      });
    }
  }

  async removeCallParticipant(convId: string, uid: string): Promise<void> {
    await updateDoc(doc(db, 'conversations', convId), {
      'call.participantIds': arrayRemove(uid)
    });
  }

  async getConversationCallMeta(convId: string): Promise<ConversationCall | null> {
    const convRef = doc(db, 'conversations', convId);
    const snap = await getDoc(convRef);

    if (!snap.exists()) {
      return null;
    }

    return (snap.data() as Conversation | undefined)?.call ?? null;
  }

  async sendFriendRequest(toUid: string): Promise<void> {
    const me = auth.currentUser?.uid;

    if (!me || me === toUid) {
      return;
    }

    const requestId = `${me}_${toUid}`;

    await setDoc(doc(db, 'friendRequests', requestId), {
      fromUid: me,
      toUid,
      status: 'pending',
      timestamp: serverTimestamp()
    });
  }

  async acceptRequest(requestId: string): Promise<void> {
    await setDoc(
      doc(db, 'friendRequests', requestId),
      { status: 'accepted' },
      { merge: true }
    );
  }

  async removeFriend(otherUid: string): Promise<void> {
    const me = auth.currentUser?.uid;

    if (!me || !otherUid) {
      throw new Error('Nincs bejelentkezett felhasználó.');
    }

    const q1 = query(
      collection(db, 'friendRequests'),
      where('fromUid', '==', me),
      where('toUid', '==', otherUid),
      where('status', '==', 'accepted')
    );

    const q2 = query(
      collection(db, 'friendRequests'),
      where('fromUid', '==', otherUid),
      where('toUid', '==', me),
      where('status', '==', 'accepted')
    );

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const batch = writeBatch(db);

    snap1.forEach((docSnap) => batch.delete(docSnap.ref));
    snap2.forEach((docSnap) => batch.delete(docSnap.ref));

    await batch.commit();
  }

  async areUsersFriends(otherUid: string): Promise<boolean> {
    const me = auth.currentUser?.uid;

    if (!me || !otherUid) {
      return false;
    }

    const q1 = query(
      collection(db, 'friendRequests'),
      where('fromUid', '==', me),
      where('toUid', '==', otherUid),
      where('status', '==', 'accepted')
    );

    const q2 = query(
      collection(db, 'friendRequests'),
      where('fromUid', '==', otherUid),
      where('toUid', '==', me),
      where('status', '==', 'accepted')
    );

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    return !snap1.empty || !snap2.empty;
  }

  listenIncomingRequests(meUid: string, cb: (items: any[]) => void): Unsubscribe {
    if (!meUid) {
      cb([]);
      return () => {};
    }

    const q = query(
      collection(db, 'friendRequests'),
      where('toUid', '==', meUid),
      where('status', '==', 'pending')
    );

    return onSnapshot(
      q,
      (snap) => {
        cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        console.error('listenIncomingRequests hiba:', error);
        cb([]);
      }
    );
  }

  listenMyFriends(meUid: string, cb: (uids: string[]) => void): Unsubscribe {
    if (!meUid) {
      cb([]);
      return () => {};
    }

    let fromAccepted: string[] = [];
    let toAccepted: string[] = [];

    const emit = () => {
      cb([...new Set([...fromAccepted, ...toAccepted])]);
    };

    const q1 = query(
      collection(db, 'friendRequests'),
      where('fromUid', '==', meUid),
      where('status', '==', 'accepted')
    );

    const q2 = query(
      collection(db, 'friendRequests'),
      where('toUid', '==', meUid),
      where('status', '==', 'accepted')
    );

    const unsub1 = onSnapshot(
      q1,
      (snap) => {
        fromAccepted = snap.docs.map((d) => d.data()['toUid']);
        emit();
      },
      (error) => console.error('listenMyFriends q1 hiba:', error)
    );

    const unsub2 = onSnapshot(
      q2,
      (snap) => {
        toAccepted = snap.docs.map((d) => d.data()['fromUid']);
        emit();
      },
      (error) => console.error('listenMyFriends q2 hiba:', error)
    );

    return () => {
      unsub1();
      unsub2();
    };
  }

  private getActiveParticipantUids(conv: Conversation): string[] {
    const removed = conv.removedMembers || [];
    return (conv.participants || []).filter((uid) => !removed.includes(uid));
  }

  async getOrCreateConversation(otherUid: string): Promise<string> {
    const me = auth.currentUser?.uid;

    if (!me) {
      throw new Error('Nincs bejelentkezett felhasználó.');
    }

    const [a, b] = [me, otherUid].sort();
    const convId = `private_${a}_${b}`;
    const convRef = doc(db, 'conversations', convId);
    const snap = await getDoc(convRef);

    if (!snap.exists()) {
      await setDoc(convRef, {
        participants: [a, b],
        type: 'private',
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        hiddenFor: [],
        removedMembers: [],
        unreadBy: {
          [a]: 0,
          [b]: 0
        }
      });
    } else {
      const data = snap.data() as Conversation;
      const currentHiddenFor = data.hiddenFor || [];
      const unreadBy = data.unreadBy || {};

      const payload: any = {
        lastMessageAt: serverTimestamp()
      };

      if (currentHiddenFor.includes(me)) {
        payload.hiddenFor = currentHiddenFor.filter((uid) => uid !== me);
      }

      if (unreadBy[me] == null) {
        payload[`unreadBy.${me}`] = 0;
      }

      await updateDoc(convRef, payload);
    }

    return convId;
  }

  async createGroup(groupName: string, participantUids: string[]): Promise<string> {
    const me = auth.currentUser?.uid;

    if (!me) {
      throw new Error('Nincs bejelentkezett felhasználó.');
    }

    const uniqueParticipants = [...new Set([...participantUids, me])];
    const unreadBy = uniqueParticipants.reduce((acc, uid) => {
      acc[uid] = 0;
      return acc;
    }, {} as Record<string, number>);

    const newGroupRef = doc(collection(db, 'conversations'));

    await setDoc(newGroupRef, {
      name: groupName,
      type: 'group',
      ownerId: me,
      participants: uniqueParticipants,
      lastMessage: 'Csoport létrehozva',
      lastMessageAt: serverTimestamp(),
      hiddenFor: [],
      removedMembers: [],
      unreadBy
    });

    return newGroupRef.id;
  }

  async leaveGroup(convId: string): Promise<void> {
    const me = auth.currentUser?.uid;

    if (!me) {
      throw new Error('Nincs bejelentkezett felhasználó.');
    }

    const convRef = doc(db, 'conversations', convId);
    const snap = await getDoc(convRef);
    const conv = snap.data() as Conversation | undefined;

    if (!conv || conv.type !== 'group') {
      throw new Error('A csoport nem található.');
    }

    const removedMembers = [...new Set([...(conv.removedMembers || []), me])];

    await setDoc(
      convRef,
      {
        removedMembers
      },
      { merge: true }
    );
  }

  async removeGroupMember(convId: string, memberUid: string): Promise<void> {
    const me = auth.currentUser?.uid;

    if (!me) {
      throw new Error('Nincs bejelentkezett felhasználó.');
    }

    const convRef = doc(db, 'conversations', convId);
    const snap = await getDoc(convRef);
    const conv = snap.data() as Conversation | undefined;

    if (!conv || conv.type !== 'group') {
      throw new Error('A csoport nem található.');
    }

    if (conv.ownerId !== me) {
      throw new Error('Csak a csoport adminja tilthat ki tagokat.');
    }

    if (memberUid === conv.ownerId) {
      throw new Error('Az adminot nem lehet kitiltani.');
    }

    const removedMembers = [...new Set([...(conv.removedMembers || []), memberUid])];

    await setDoc(
      convRef,
      {
        removedMembers
      },
      { merge: true }
    );
  }

  async addGroupMembers(convId: string, memberUids: string[]): Promise<void> {
    const me = auth.currentUser?.uid;

    if (!me) {
      throw new Error('Nincs bejelentkezett felhasználó.');
    }

    const cleaned = [...new Set(memberUids.filter(Boolean))];
    if (cleaned.length === 0) {
      return;
    }

    const convRef = doc(db, 'conversations', convId);
    const snap = await getDoc(convRef);
    const conv = snap.data() as Conversation | undefined;

    if (!conv || conv.type !== 'group') {
      throw new Error('A csoport nem található.');
    }

    if (conv.ownerId !== me) {
      throw new Error('Csak a csoport adminja adhat hozzá tagokat.');
    }

    const participants = [...new Set([...(conv.participants || []), ...cleaned])];
    const removedMembers = (conv.removedMembers || []).filter((uid) => !cleaned.includes(uid));
    const hiddenFor = (conv.hiddenFor || []).filter((uid) => !cleaned.includes(uid));
    const unreadBy = { ...(conv.unreadBy || {}) };

    cleaned.forEach((uid) => {
      if (unreadBy[uid] == null) {
        unreadBy[uid] = 0;
      }
    });

    await setDoc(
      convRef,
      {
        participants,
        removedMembers,
        hiddenFor,
        unreadBy
      },
      { merge: true }
    );
  }

  async deleteConversation(convId: string): Promise<void> {
    const me = auth.currentUser?.uid;

    if (!me) {
      throw new Error('Nincs bejelentkezett felhasználó.');
    }

    const convRef = doc(db, 'conversations', convId);
    const convSnap = await getDoc(convRef);
    const convData = convSnap.data() as Conversation | undefined;

    if (!convData) {
      return;
    }

    const activeParticipants = this.getActiveParticipantUids(convData);
    const hiddenFor = convData.hiddenFor || [];
    const nextHiddenFor = [...new Set([...hiddenFor, me])];

    if (activeParticipants.length > 0 && activeParticipants.every((uid) => nextHiddenFor.includes(uid))) {
      const batch = writeBatch(db);
      const msgsSnap = await getDocs(collection(db, 'conversations', convId, 'messages'));

      msgsSnap.forEach((m) => batch.delete(m.ref));
      batch.delete(convRef);

      await batch.commit();
      return;
    }

    await setDoc(
      convRef,
      {
        hiddenFor: nextHiddenFor
      },
      { merge: true }
    );
  }

  listenMyConversations(meUid: string, cb: (items: Conversation[]) => void): Unsubscribe {
    if (!meUid) {
      cb([]);
      return () => {};
    }

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', meUid),
      orderBy('lastMessageAt', 'desc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map(
            (d) =>
              ({
                id: d.id,
                ...d.data()
              }) as Conversation
          )
          .filter((c) => !(c.hiddenFor || []).includes(meUid));

        cb(items);
      },
      (error) => {
        console.error('listenMyConversations hiba:', error);
        cb([]);
      }
    );
  }

  listenMessages(convId: string, cb: (items: ChatMessage[]) => void): Unsubscribe {
    const q = query(
      collection(db, 'conversations', convId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const msgs = snap.docs.map(
          (d) =>
            ({
              id: d.id,
              ...d.data()
            }) as ChatMessage
        );

        cb(msgs);
      },
      (error) => {
        console.error('listenMessages hiba:', error);
        cb([]);
      }
    );
  }

  listenUnreadTotal(meUid: string, cb: (count: number) => void): Unsubscribe {
    if (!meUid) {
      cb(0);
      return () => {};
    }

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', meUid)
    );

    return onSnapshot(
      q,
      (snap) => {
        const total = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Conversation))
          .filter((c) => !(c.hiddenFor || []).includes(meUid))
          .reduce((sum, c) => sum + (c.unreadBy?.[meUid] || 0), 0);

        cb(total);
      },
      (error) => {
        console.error('listenUnreadTotal hiba:', error);
        cb(0);
      }
    );
  }

  async markConversationAsRead(convId: string): Promise<void> {
    const me = auth.currentUser?.uid;

    if (!me) {
      return;
    }

    const convRef = doc(db, 'conversations', convId);
    await updateDoc(convRef, {
      [`unreadBy.${me}`]: 0
    });
  }

  async sendMessage(convId: string, text: string, imageUrl?: string): Promise<void> {
    const me = auth.currentUser?.uid;

    if (!me) {
      throw new Error('Nincs bejelentkezett felhasználó.');
    }

    const convRef = doc(db, 'conversations', convId);
    const convSnap = await getDoc(convRef);
    const convData = convSnap.data() as Conversation | undefined;

    if (!convData) {
      throw new Error('A beszélgetés nem található.');
    }

    if ((convData.removedMembers || []).includes(me)) {
      throw new Error('Már nem vagy a csoport tagja.');
    }

    if (convData.type === 'private') {
      const otherUid = (convData.participants || []).find((uid) => uid !== me);

      if (!otherUid) {
        throw new Error('A másik felhasználó nem található.');
      }

      const stillFriends = await this.areUsersFriends(otherUid);

      if (!stillFriends) {
        throw new Error('Már nem vagytok barátok, ezért nem tudtok egymásnak írni.');
      }
    }

    const cleanText = text.trim();
    const msgCol = collection(db, 'conversations', convId, 'messages');

 const meDoc = await getDoc(doc(db, 'users', me));
const meData = meDoc.exists() ? meDoc.data() as any : {};

await addDoc(msgCol, {
  senderId: me,
  text: cleanText || null,
  imageUrl: imageUrl || null,

  senderName:
    meData.username ||
    meData.displayName ||
    auth.currentUser?.displayName ||
    auth.currentUser?.email ||
    'Felhasználó',

  senderPhotoUrl:
    meData.profilePhotoUrl || '',

  senderPhotoSettings:
    meData.profilePhotoSettings || null,

  createdAt: serverTimestamp()
});

    const removedMembers = convData.removedMembers || [];
    const currentHiddenFor = convData.hiddenFor || [];
    const nextHiddenFor =
      convData.type === 'group'
        ? currentHiddenFor.filter((uid) => removedMembers.includes(uid))
        : [];

    const activeRecipients = (convData.participants || []).filter(
      (uid) => uid !== me && !removedMembers.includes(uid)
    );

    const payload: any = {
      hiddenFor: nextHiddenFor,
      lastMessage: imageUrl ? '📷 Kép' : cleanText,
      lastMessageAt: serverTimestamp(),
      [`unreadBy.${me}`]: 0
    };

    activeRecipients.forEach((uid) => {
      payload[`unreadBy.${uid}`] = (convData.unreadBy?.[uid] || 0) + 1;
    });

    await updateDoc(convRef, payload);
  }

  async uploadChatImage(convId: string, file: File): Promise<string> {
    const me = auth.currentUser?.uid;

    if (!me) {
      throw new Error('Nincs bejelentkezett felhasználó.');
    }

    const safeFileName = file.name.replace(/\s+/g, '_');
    const filePath = `chat-images/${convId}/${Date.now()}_${me}_${safeFileName}`;
    const storageRef = ref(storage, filePath);

    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  }

  async sendImageMessage(convId: string, file: File): Promise<void> {
    const imageUrl = await this.uploadChatImage(convId, file);
    await this.sendMessage(convId, '', imageUrl);
  }

  async searchUsers(term: string): Promise<UserResult[]> {
    const t = term.trim().toLowerCase();

    if (!t) {
      return [];
    }

    const q = query(
      collection(db, 'users'),
      orderBy('usernameLower'),
      startAt(t),
      endAt(t + '\uf8ff'),
      limit(10)
    );

    const snap = await getDocs(q);

    return snap.docs
      .map((d) => ({
        uid: d.id,
        username: d.data()['username']
      }))
      .filter((u) => u.uid !== auth.currentUser?.uid);
  }

 async getUserData(uid: string): Promise<UserResult & { profilePhotoUrl?: string; displayName?: string }> {
  const d = await getDoc(doc(db, 'users', uid));
  const data = d.exists() ? d.data() as any : {};

  return {
    uid,
    username: data.username || data.displayName || 'Ismeretlen',
    displayName: data.displayName || data.username || 'Ismeretlen',
    profilePhotoUrl: data.profilePhotoUrl || '',
    profilePhotoSettings: data.profilePhotoSettings || undefined
  };
}
}