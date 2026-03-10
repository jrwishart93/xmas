import {
  auth,
  db,
  doc,
  getDoc,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  deleteUser,
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

function appError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function isPermissionDeniedError(error) {
  const code = error?.code || '';
  const message = error?.message || '';
  return code.includes('permission-denied') || /insufficient permissions/i.test(message);
}

function isEmailAlreadyInUseError(error) {
  return String(error?.code || '').includes('email-already-in-use');
}

function isInvalidCredentialError(error) {
  const code = String(error?.code || '');
  return code.includes('invalid-credential') || code.includes('wrong-password');
}

async function getMembershipForUser(uid) {
  const membershipRef = doc(db, 'teams', TEAM_ID, 'members', uid);
  try {
    const membershipSnap = await getDoc(membershipRef);
    return membershipSnap.exists() ? membershipSnap.data() : null;
  } catch (error) {
    // Treat a blocked read on the current user's own membership lookup as "not joined yet".
    if (isPermissionDeniedError(error) && auth.currentUser?.uid === uid) {
      return null;
    }
    throw error;
  }
}

async function assertTeamMembership(user) {
  const membership = await getMembershipForUser(user.uid);
  if (!membership) {
    await signOut(auth);
    clearSessionCookie();
    throw appError(
      'app/team-membership-required',
      'Your account is not linked to this team fund. Use Sign Up with the team access code to join.'
    );
  }
  return membership;
}

async function createMembershipForUser(user, fullName, accessCode) {
  const existingMembership = await getMembershipForUser(user.uid);
  if (existingMembership) return existingMembership;

  const idToken = await user.getIdToken(true);
  const response = await fetch('/api/team/join', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      accessCode,
      fullName,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Unable to join the team fund.');
  }

  const membership = await getMembershipForUser(user.uid);
  if (!membership) {
    throw appError(
      'app/team-membership-unverified',
      'Your account was created, but the team membership record could not be verified.'
    );
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

export async function register({ fullName, email, password, accessCode, remember = true }) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  let credentials;
  let createdNewUser = false;

  try {
    credentials = await createUserWithEmailAndPassword(auth, email, password);
    createdNewUser = true;
  } catch (error) {
    if (!isEmailAlreadyInUseError(error)) throw error;

    try {
      credentials = await signInWithEmailAndPassword(auth, email, password);
    } catch (signInError) {
      if (isInvalidCredentialError(signInError)) {
        throw appError(
          'app/existing-account-password-required',
          'An account already exists with this email. Sign in with the same password or reset it first.'
        );
      }
      throw signInError;
    }
  }

  if (fullName?.trim() && (!credentials.user.displayName || createdNewUser)) {
    await updateProfile(credentials.user, { displayName: fullName.trim() });
  }

  try {
    const membership = await createMembershipForUser(credentials.user, fullName, accessCode);
    setSessionCookie();
    return { user: credentials.user, membership };
  } catch (error) {
    if (createdNewUser) {
      await deleteUser(credentials.user).catch(() => signOut(auth).catch(() => null));
    } else {
      await signOut(auth).catch(() => null);
    }
    clearSessionCookie();
    throw error;
  }
}

export async function requestPasswordReset(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function logout() {
  try {
    await signOut(auth);
  } finally {
    clearSessionCookie();
  }
}

export { assertTeamMembership };

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
