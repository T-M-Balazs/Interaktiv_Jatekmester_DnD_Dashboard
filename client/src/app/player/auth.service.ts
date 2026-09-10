import { Injectable } from '@angular/core';
import { auth, db } from './firebase-config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Ezen a csatornán küldjük a felhasználónevet a menünek
private userProfileSubject = new BehaviorSubject<any>(null);
userProfile$ = this.userProfileSubject.asObservable();

private authReadySubject = new BehaviorSubject<boolean>(false);
authReady$ = this.authReadySubject.asObservable();

currentUser: User | null = null;

 constructor() {
  onAuthStateChanged(auth, async (user) => {
    this.currentUser = user;

    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        this.userProfileSubject.next(userDoc.data());
      } else {
        this.userProfileSubject.next({ username: user.email });
      }
    } else {
      this.userProfileSubject.next(null);
    }

    this.authReadySubject.next(true);
  });
}

  async login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async register(email: string, password: string, username: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Mentés Firestore-ba
   await setDoc(doc(db, 'users', cred.user.uid), {
  uid: cred.user.uid,
  email: email,
  username: username,
  usernameLower: username.toLowerCase(), // 👈 EZ KELL A KERESÉSHEZ!
  createdAt: serverTimestamp()
});
    return cred;
  }

  async logout() {
    return signOut(auth);
  }

  updateUserProfile(profile: any): void {
    this.userProfileSubject.next(profile);
  }
}