// src/firebase/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// If you need additional Firebase SDKs (Firestore/Auth), import them here.

const firebaseConfig = {
  apiKey: "AIzaSyDGG0aGrcm4xy0M5GK4PUOvSAX2XM3UncU",
  authDomain: "xmas-night-5efcb.firebaseapp.com",
  projectId: "xmas-night-5efcb",
  storageBucket: "xmas-night-5efcb.firebasestorage.app",
  messagingSenderId: "446226413385",
  appId: "1:446226413385:web:cc62f5b7ec123a19f14c98",
  measurementId: "G-WZZZTPBP44"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);