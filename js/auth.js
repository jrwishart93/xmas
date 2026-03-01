import {
  auth,
  db,
  doc,
  getDoc,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from '/firebase.js';
import { TEAM_ID } from '/js/constants.js';

export async function login(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
  document.cookie = 'stf_session=1; path=/; max-age=2592000; samesite=lax';
}

export async function logout() {
  document.cookie = 'stf_session=; path=/; max-age=0; samesite=lax';
  await signOut(auth);
}

export function requireAuth({ onReady }) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = '/';
      return;
    }

    const membershipRef = doc(db, 'teams', TEAM_ID, 'members', user.uid);
    const membershipSnap = await getDoc(membershipRef);

    if (!membershipSnap.exists()) {
      await logout();
      alert('You are not a member of this Social Team Fund.');
      window.location.href = '/';
      return;
    }

    const membership = membershipSnap.data();
    onReady({ user, membership });
  });
}
