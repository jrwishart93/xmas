import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAnalytics,
  isSupported,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-analytics.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  deleteUser,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  runTransaction,
  increment,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBAxMyG-sJp6Q9X1QZtgU5eUMqE_EZVmCw",
  authDomain: "xmas-night-5efcb.firebaseapp.com",
  projectId: "xmas-night-5efcb",
  storageBucket: "xmas-night-5efcb.firebasestorage.app",
  messagingSenderId: "446226413385",
  appId: "1:446226413385:web:530e00786a907e09f14c98",
  measurementId: "G-E1B56LE4V5",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = (await isSupported().catch(() => false))
  ? getAnalytics(app)
  : null;

await setPersistence(auth, browserLocalPersistence);

export {
  app,
  auth,
  analytics,
  db,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  runTransaction,
  increment,
  serverTimestamp,
  updateDoc,
  Timestamp,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  deleteUser,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
};
