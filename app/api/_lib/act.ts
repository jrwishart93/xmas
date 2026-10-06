import localAct from '../../../data/act.json';
import { getAdminDb } from './firebaseAdmin';

const ACT_DOC_PATH = 'acts/social_contributions_act_2025';

export type ActClause = {
  code: string;
  title: string;
  amountPence: number;
  latePenaltyMultiplier: number;
  latePenaltyAfterDays: number;
};

type RawSection = {
  code?: string;
  title?: string;
  amountPence?: number;
  amountGBP?: number;
  latePenaltyMultiplier?: number;
  latePenaltyAfterDays?: number;
};

type RawAct = { parts?: { sections?: RawSection[] }[] };

function flattenAct(act: RawAct): Map<string, ActClause> {
  const clauses = new Map<string, ActClause>();
  for (const part of act.parts || []) {
    for (const section of part.sections || []) {
      const code = String(section.code || '').trim();
      const amountPence = Math.round(Number(section.amountPence || Number(section.amountGBP || 0) * 100));
      if (!code || !(amountPence > 0)) continue;
      clauses.set(code, {
        code,
        title: String(section.title || code),
        amountPence,
        latePenaltyMultiplier: Math.max(1, Math.round(Number(section.latePenaltyMultiplier || 2))),
        latePenaltyAfterDays: Math.max(0, Math.round(Number(section.latePenaltyAfterDays ?? 3))),
      });
    }
  }
  return clauses;
}

// Mirrors js/act.js: the Firestore copy of the Act wins when present, the bundled JSON is the fallback.
export async function getActClauses(): Promise<Map<string, ActClause>> {
  try {
    const snapshot = await getAdminDb().doc(ACT_DOC_PATH).get();
    if (snapshot.exists) {
      const clauses = flattenAct(snapshot.data() as RawAct);
      if (clauses.size) return clauses;
    }
  } catch (error) {
    console.warn('Unable to load Act from Firestore, using bundled copy.', error);
  }
  return flattenAct(localAct as RawAct);
}
