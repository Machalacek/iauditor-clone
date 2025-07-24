// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { OAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCMLm40mhxOuLMqSvuDcZhmkBDOgnUdwU8",
  authDomain: "moravia-safety-app.firebaseapp.com",
  projectId: "moravia-safety-app",
  storageBucket: "moravia-safety-app.firebasestorage.app",
  messagingSenderId: "101976850235",
  appId: "1:101976850235:web:11036a3a85d12f9e06811e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); // ✅ NEW
export const msProvider = new OAuthProvider('microsoft.com');
export const storage = getStorage(app);