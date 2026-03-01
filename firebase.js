import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  runTransaction,
  increment,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDGG0aGrcm4xy0M5GK4PUOvSAX2XM3UncU",
  authDomain: "xmas-night-5efcb.firebaseapp.com",
  projectId: "xmas-night-5efcb",
  storageBucket: "xmas-night-5efcb.firebasestorage.app",
  messagingSenderId: "446226413385",
  appId: "1:446226413385:web:cc62f5b7ec123a19f14c98",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

await setPersistence(auth, browserLocalPersistence);

export {
  auth,
  db,
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  runTransaction,
  increment,
  serverTimestamp,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
};
