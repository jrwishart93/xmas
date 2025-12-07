import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { db } from "../../firebase.js";

/**
 * Fetch the list of users from Firestore and return a map keyed by document ID.
 * Falls back to an empty object if the query fails.
 */
export async function fetchUsersFromFirestore() {
  try {
    const snap = await getDocs(collection(db, "users"));
    const users = {};
    snap.forEach((docSnap) => {
      users[docSnap.id] = docSnap.data();
    });
    return users;
  } catch (error) {
    console.error("Unable to load users from Firestore", error);
    return {};
  }
}
