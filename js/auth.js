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
  sendPasswordResetEmail,
} from '/firebase.js';
import { TEAM_ID } from '/js/constants.js';

function setSessionCookie() {
  document.cookie = 'stf_session=1; path=/; max-age=2592000; samesite=lax';
}

function clearSessionCookie() {
  document.cookie = 'stf_session=; path=/; max-age=0; samesite=lax';
}

async function getMembershipForUser(uid) {
  const membershipRef = doc(db, 'teams', TEAM_ID, 'members', uid);
  const membershipSnap = await getDoc(membershipRef);
  return membershipSnap.exists() ? membershipSnap.data() : null;
}

async function assertTeamMembership(user) {
  const membership = await getMembershipForUser(user.uid);
  if (!membership) {
    await signOut(auth);
    clearSessionCookie();
    throw new Error('Your account is not linked to this team fund yet. Ask an admin to add you before signing in.');
  }
  return membership;
}

export async function login(email, password, remember = true) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const credentials = await signInWithEmailAndPassword(auth, email, password);
  const membership = await assertTeamMembership(credentials.user);
  setSessionCookie();
  return { user: credentials.user, membership };
}

export async function register({ fullName, email, password, remember = true }) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const credentials = await createUserWithEmailAndPassword(auth, email, password);

  if (fullName?.trim()) {
    await updateProfile(credentials.user, { displayName: fullName.trim() });
  }

  try {
    const membership = await assertTeamMembership(credentials.user);
    setSessionCookie();
    return { user: credentials.user, membership };
  } catch (error) {
    throw new Error('Account created, but team access is blocked. Ask an admin to link your account, then sign in.');
  }
}

export async function requestPasswordReset(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function logout() {
  clearSessionCookie();
  await signOut(auth);
}

export function requireAuth({ onReady }) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = '/';
      return;
    }

    try {
      const membership = await assertTeamMembership(user);
      onReady({ user, membership });
    } catch (error) {
      alert(error?.message || 'You are not authorised to access this Team Social Fund.');
      window.location.href = '/';
    }
  });
}
