// src/data/resetChoices.js
import { db } from "../../firebase.js";
import {
  doc,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

/**
 * Clears a user's saved selections in Firestore.
 *
 * @param {string} userId
 * @param {Array} zeroSelections - List of items to reset with zero quantities
 * @param {string} legacyId - Optional legacy identifier (e.g. username)
 */
export async function resetUserSelections(
  userId,
  zeroSelections = [],
  legacyId = ""
) {
  if (!userId) throw new Error("Missing userId in resetUserSelections()");

  const sanitizedSelections = Array.isArray(zeroSelections)
    ? zeroSelections
        .filter((item) => Boolean(item?.name))
        .map((item) => ({
          name: item.name,
          price: Number(item.price) || 0,
          qty: 0,
        }))
    : [];

  const zeroChoiceMap = sanitizedSelections.reduce((acc, item) => {
    acc[item.name] = { qty: 0, price: Number(item.price) || 0 };
    return acc;
  }, {});

  const userRef = doc(db, "choices", userId);
  await setDoc(
    userRef,
    {
      uid: userId,
      legacyId,
      hasSubmitted: false,
      choices: zeroChoiceMap,
      selections: sanitizedSelections,
      total: 0,
      totalSpend: 0,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
