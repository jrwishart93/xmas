// src/data/saveChoices.js
import { db } from "../../firebase.js";
import {
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

/**
 * Saves the user's selections to Firestore in a safe, structured way.
 *
 * @param {string} userId - Document ID of the user
 * @param {string} userName - Display name of the user
 * @param {Array} selections - Array of objects: { name, price, qty }
 * @param {number} totalSpent - Total cost of selections
 */
export async function saveUserSelections(userId, userName, selections, totalSpent) {
  if (!userId) throw new Error("Missing userId in saveUserSelections()");
  if (!Array.isArray(selections)) throw new Error("Selections must be an array");

  const filteredItems = selections
    .filter((s) => (Number(s.qty) || 0) > 0)
    .map((s) => ({
      name: s.name,
      price: Number(s.price) || 0,
      qty: Number(s.qty) || 0
    }));

  const safeTotal = Number(totalSpent) || 0;
  const userRef = doc(db, "choices", userId);

  await setDoc(userRef, {
    name: userName || userId,
    timestamp: Date.now(),
    items: filteredItems,
    total: safeTotal,
    submitted: true
  });
}

