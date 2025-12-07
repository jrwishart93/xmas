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
 * @param {Object} choices - Map of drinkId/name -> quantity & price
 * @param {number} totalSpend - Total cost of selections
 * @param {Array} selections - Normalised selections array
 */
export async function saveUserSelections(
  userId,
  userName,
  choices,
  totalSpend,
  selections = []
) {
  if (!userId) throw new Error("Missing userId in saveUserSelections()");
  if (!choices || typeof choices !== "object") {
    throw new Error("Choices must be provided as an object map");
  }

  const safeTotal = Number(totalSpend) || 0;
  const safeChoices = Object.entries(choices).reduce((acc, [key, data]) => {
    const qty = typeof data === "object" ? data?.qty : data;
    const price = typeof data === "object" ? data?.price : undefined;
    acc[key] = {
      qty: Number(qty) || 0,
      price: Number(price) || 0
    };
    return acc;
  }, {});

  const safeSelections = Array.isArray(selections)
    ? selections
        .filter((item) => Boolean(item?.name))
        .map((item) => ({
          name: item.name,
          price: Number(item.price) || 0,
          qty: Number(item.qty) || 0
        }))
    : [];

  const userRef = doc(db, "users", userId);

  await setDoc(
    userRef,
    {
      name: userName || userId,
      hasSubmitted: true,
      total: safeTotal,
      totalSpend: safeTotal,
      choices: safeChoices,
      selections: safeSelections,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

