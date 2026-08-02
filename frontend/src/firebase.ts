import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCBD2eR_uK0TLVnFx2IClbHq46y-aSd6l0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gyancmeet.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gyancmeet",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gyancmeet.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "646071030759",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:646071030759:web:0d5ad19253cec7e129a342"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
