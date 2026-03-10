import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

function getAdminApp() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin SDK environment variables.');
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

let adminDbInstance: Firestore | null = null;
let adminAuthInstance: Auth | null = null;

export function getAdminDb() {
  if (!adminDbInstance) {
    adminDbInstance = getFirestore(getAdminApp());
  }

  return adminDbInstance;
}

export function getAdminAuth() {
  if (!adminAuthInstance) {
    adminAuthInstance = getAuth(getAdminApp());
  }

  return adminAuthInstance;
}
