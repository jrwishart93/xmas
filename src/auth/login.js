// src/auth/login.js
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { app } from "../firebase/firebaseConfig.js";
import { validatePin } from "../utils/validatePin.js";

const db = getFirestore(app);

export async function loginUser(username, pin) {
  // simple validation
  if (!validatePin(pin)) {
    throw new Error("PIN must be 4 numeric digits.");
  }

  // Retrieve the user's record from Firestore
  const userRef = doc(db, "users", username);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("User not found.");
  }

  const data = userSnap.data();
  if (data.pin !== pin) {
    throw new Error("Invalid PIN.");
  }

  // If valid, store session (could be localStorage) and return success
  localStorage.setItem("currentUser", username);
  return true;
}