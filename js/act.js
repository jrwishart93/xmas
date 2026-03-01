import { db, doc, getDoc } from '/firebase.js';

const ACT_DOC_PATH = ['acts', 'social_contributions_act_2025'];

export async function loadAct() {
  try {
    const actDoc = await getDoc(doc(db, ...ACT_DOC_PATH));
    if (actDoc.exists()) {
      return normalizeActData(actDoc.data());
    }
  } catch (error) {
    console.warn('Unable to load Act from Firestore, falling back to local data.', error);
  }

  const response = await fetch('/data/act.json');
  if (!response.ok) throw new Error('Unable to load Act data');
  return normalizeActData(await response.json());
}

function normalizeActData(data) {
  return {
    title: data.title,
    version: data.version,
    lastUpdated: data.lastUpdated,
    parts: data.parts || [],
  };
}

export function flattenClauses(act) {
  return (act.parts || []).flatMap((part) => part.sections || []);
}
