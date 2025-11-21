// src/data/saveChoices.js
import { db } from "../../firebase.js";
import {
  doc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

/**
 * Saves the user's selections to Firestore in a safe, structured way.
 *
 * @param {string} userId - Document ID of the user
 * @param {string} userName - Display name of the user
 * @param {Object} choices - Map of drinkId/name -> quantity
 * @param {number} totalSpend - Total cost of selections
 */
export async function saveUserSelections(userId, userName, choices, totalSpend) {
  if (!userId) throw new Error("Missing userId in saveUserSelections()");
  if (!choices || typeof choices !== "object") {
    throw new Error("Choices must be provided as an object map");
  }

  const safeTotal = Number(totalSpend) || 0;
  const safeChoices = Object.entries(choices).reduce((acc, [key, qty]) => {
    acc[key] = Number(qty) || 0;
    return acc;
  }, {});

  const userRef = doc(db, "users", userId);

  await setDoc(
    userRef,
    {
      name: userName || userId,
      hasSubmitted: true,
      totalSpend: safeTotal,
      choices: safeChoices,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

