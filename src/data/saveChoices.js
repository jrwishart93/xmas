// src/data/saveChoices.js
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
import { app } from "../firebase/firebaseConfig.js";

const db = getFirestore(app);

export async function saveChoices(username, selections) {
  // selections: array of { name, quantity, price }
  // Save under users/{username}/choices
  const userChoicesRef = doc(collection(db, "users", username, "choices"));
  await setDoc(userChoicesRef, {
    selections,
    submittedAt: Date.now()
  });
}
