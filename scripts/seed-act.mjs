import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { readFile } from 'node:fs/promises';

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore(app);
const raw = JSON.parse(await readFile(new URL('../data/act.json', import.meta.url), 'utf8'));

const payload = {
  title: raw.title,
  version: raw.version,
  lastUpdated: raw.lastUpdated ? Timestamp.fromDate(new Date(raw.lastUpdated)) : FieldValue.serverTimestamp(),
  parts: raw.parts.map((part) => ({
    partNumber: part.partNumber,
    title: part.title,
    operationallySensitive: part.operationallySensitive,
    sections: part.sections.map((section) => ({
      code: section.code,
      title: section.title,
      description: section.description,
    })),
  })),
};

await db.doc('acts/social_contributions_act_2025').set(payload, { merge: true });

console.log('Seeded act acts/social_contributions_act_2025');
