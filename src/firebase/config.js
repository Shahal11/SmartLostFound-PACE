// src/firebase/config.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics"; // Analytics is optional for core functionality

// New imports for core services
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration (using your provided values)
const firebaseConfig = {
  apiKey: "AIzaSyAqSJF-eSEBsxdeT9aaDYp04RrFl9RnGVI",
  authDomain: "lostfoundai-1e223.firebaseapp.com",
  projectId: "lostfoundai-1e223",
  storageBucket: "lostfoundai-1e223.firebasestorage.app",
  messagingSenderId: "159503346045",
  appId: "1:159503346045:web:2e3973684b6017e9a98414",
  measurementId: "G-6W393F1WYT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // Keep this commented unless you actively use it

// Initialize and Export CORE services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// NOTE: You'll also need to configure your .env file for the Gemini and Maps API keys.