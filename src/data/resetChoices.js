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
 */
export async function resetUserSelections(userId) {
  if (!userId) throw new Error("Missing userId in resetUserSelections()");

  const userRef = doc(db, "users", userId);
  await setDoc(
    userRef,
    {
      hasSubmitted: false,
      choices: {},
      selections: [],
      total: 0,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
