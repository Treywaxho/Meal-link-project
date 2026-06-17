/**
 * js/firebase-config.js
 * Initialize Firebase Configuration and Services
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
// If you'd like to use analytics, uncomment the line below
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyAUfbADGmqWfdA8RShhUC7Tdu8CuQzVAq0",
    authDomain: "meal-link-7d599.firebaseapp.com",
    projectId: "meal-link-7d599",
    storageBucket: "meal-link-7d599.firebasestorage.app",
    messagingSenderId: "498796187792",
    appId: "1:498796187792:web:09927a842525f0ea524815",
    measurementId: "G-TZGMMNVLLL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// export const analytics = getAnalytics(app);
