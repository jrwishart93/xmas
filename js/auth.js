import {
  auth,
  db,
  doc,
  getDoc,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from '/firebase.js';
import { TEAM_ID } from '/js/constants.js';

export async function login(email, password, remember = true) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  await signInWithEmailAndPassword(auth, email, password);
  document.cookie = 'stf_session=1; path=/; max-age=2592000; samesite=lax';
}

export async function register({ fullName, email, password, remember = true }) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const credentials = await createUserWithEmailAndPassword(auth, email, password);

  if (fullName?.trim()) {
    await updateProfile(credentials.user, { displayName: fullName.trim() });
  }

  document.cookie = 'stf_session=1; path=/; max-age=2592000; samesite=lax';
  return credentials.user;
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
