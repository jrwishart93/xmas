import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore(app);

await db.doc('teams/rpu-social-fund').set({
  name: 'RPU Social Fund',
  moneyBalancePence: 0,
  confirmedBalancePence: 0,
  pendingBalancePence: 0,
  createdAt: FieldValue.serverTimestamp(),
}, { merge: true });

console.log('Seeded team teams/rpu-social-fund');
