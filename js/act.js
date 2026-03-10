const ACT_DOC_PATH = ['acts', 'social_contributions_act_2025'];
let firebaseModulesPromise;

async function getFirestoreHelpers() {
  if (!firebaseModulesPromise) {
    firebaseModulesPromise = import('/firebase.js').then(({ db, doc, getDoc }) => ({
      db,
      doc,
      getDoc,
    }));
  }

  return firebaseModulesPromise;
}

async function fetchRawLocalAct() {
  const response = await fetch('/data/act.json');
  if (!response.ok) throw new Error('Unable to load Act data');
  return response.json();
}

export async function loadLocalAct() {
  return normalizeActData(await fetchRawLocalAct());
}

export async function loadAct() {
  const localActPromise = fetchRawLocalAct().catch(() => null);

  try {
    const { db, doc, getDoc } = await getFirestoreHelpers();
    const actDoc = await getDoc(doc(db, ...ACT_DOC_PATH));
    if (actDoc.exists()) {
      return normalizeActData(actDoc.data(), await localActPromise);
    }
  } catch (error) {
    console.warn('Unable to load Act from Firestore, falling back to local data.', error);
  }

  const localAct = await localActPromise;
  if (!localAct) throw new Error('Unable to load Act data');
  return normalizeActData(localAct);
}

function normalizeSection(section, templateSection = {}) {
  const amountPence = Number(section.amountPence || templateSection.amountPence || 0);
  const latePenaltyMultiplier = Number(
    section.latePenaltyMultiplier || templateSection.latePenaltyMultiplier || 2
  );
  const latePenaltyAfterDays = Number(
    section.latePenaltyAfterDays || templateSection.latePenaltyAfterDays || 3
  );

  return {
    ...section,
    code: section.code || templateSection.code || '',
    id: section.id || section.code || templateSection.id || templateSection.code || '',
    title: section.title || templateSection.title || '',
    description: section.description || templateSection.description || '',
    amountPence,
    amountGBP: Number(section.amountGBP || templateSection.amountGBP || amountPence / 100),
    typicalAmountPence: amountPence,
    latePenaltyMultiplier,
    latePenaltyAfterDays,
  };
}

function normalizeActData(data, templateData = null) {
  const templateParts = templateData?.parts || [];
  const parts = (data.parts || []).map((part) => {
    const templatePart =
      templateParts.find(
        (candidate) =>
          candidate.partNumber === part.partNumber || String(candidate.title) === String(part.title)
      ) || null;

    return {
      ...part,
      sections: (part.sections || []).map((section) => {
        const templateSection =
          templatePart?.sections?.find((candidate) => String(candidate.code) === String(section.code)) || null;
        return normalizeSection(section, templateSection || {});
      }),
    };
  });

  return {
    title: data.title,
    version: data.version,
    lastUpdated: data.lastUpdated,
    parts,
  };
}

export function flattenClauses(act) {
  return (act.parts || []).flatMap((part) => part.sections || []);
}
