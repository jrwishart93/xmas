// src/data/choicesStore.js
import { db } from "../../firebase.js";
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/**
 * Fetch a user's choices document from Firestore.
 *
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function loadUserChoices(userId) {
  if (!userId) return null;

  const choiceRef = doc(db, "choices", userId);
  const snap = await getDoc(choiceRef);
  if (!snap.exists()) return null;

  return snap.data();
}

/**
 * Save or merge a user's choices document in Firestore.
 *
 * @param {string} userId
 * @param {object} payload
 * @returns {Promise<void>}
 */
export async function saveUserChoices(userId, payload) {
  if (!userId) throw new Error("Missing userId when saving choices");
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload when saving choices");
  }

  const body = {
    ...payload,
    submitted: true,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, "choices", userId), body, { merge: true });
}

/**
 * Subscribe to a user's choices document and get live updates.
 *
 * @param {string} userId
 * @param {(data: object | null) => void} onData
 * @param {(error: Error) => void} onError
 * @returns {() => void} unsubscribe function
 */
export function listenToUserChoices(userId, onData, onError) {
  if (!userId) return () => {};

  const choiceRef = doc(db, "choices", userId);
  return onSnapshot(
    choiceRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData?.(null);
        return;
      }

      onData?.(snapshot.data());
    },
    (error) => {
      console.error("Choices listener error", error);
      onError?.(error);
    }
  );
}

export const choicesStore = {
  loadUserChoices,
  saveUserChoices,
  listenToUserChoices,
};
