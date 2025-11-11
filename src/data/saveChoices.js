import { db } from "../firebase/firebaseConfig.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

export async function saveUserSelections(userId, selections, totalSpent) {
  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, {
    selections: selections,     // full map of selected items
    totalSpent: totalSpent,
    budget: 20 - totalSpent,
    hasSubmitted: true
  });
}