// src/firebase/firebaseConfig.js
// This project is served as plain ES modules without a bundler, so we need to
// source Firebase directly from the gstatic CDN. The previous version imported
// from the npm package names ("firebase/app" etc.), which throws in the browser
// because there is no build step to rewrite those specifiers.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

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
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
