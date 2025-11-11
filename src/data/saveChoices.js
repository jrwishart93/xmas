// src/data/saveChoices.js
import { db } from "../firebase/firebaseConfig.js";
import {
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

/**
 * Saves the user's selections to Firestore in a safe, structured way.
 *
 * @param {string} userId - Document ID of the user
 * @param {Array} selections - Array of objects: { name, price, qty }
 * @param {number} totalSpent - Total cost of selections
 */
export async function saveUserSelections(userId, selections, totalSpent) {
  if (!userId) throw new Error("Missing userId in saveUserSelections()");
  if (!Array.isArray(selections)) throw new Error("Selections must be an array");

  const safeTotal = Number(totalSpent) || 0;
  const remaining = Math.max(0, 20 - safeTotal); // prevent negative balance

  const userRef = doc(db, "users", userId);

  // Save in a clean format
  await setDoc(
    userRef,
    {
      selections: selections.map((s) => ({
        name: s.name,
        price: Number(s.price),
        qty: Number(s.qty)
      })),
      totalSpent: safeTotal,
      budgetRemaining: remaining,
      hasSubmitted: true,
      lastUpdated: new Date()
    },
    { merge: true }
  );
}