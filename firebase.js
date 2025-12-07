// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDGG0aGrcm4xy0M5GK4PUOvSAX2XM3UncU",
  authDomain: "xmas-night-5efcb.firebaseapp.com",
  projectId: "xmas-night-5efcb",
  storageBucket: "xmas-night-5efcb.firebasestorage.app",
  messagingSenderId: "446226413385",
  appId: "1:446226413385:web:cc62f5b7ec123a19f14c98",
  measurementId: "G-WZZZTPBP44"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
