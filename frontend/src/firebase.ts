import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCBD2eR_uK0TLVnFx2IClbHq46y-aSd6l0",
  authDomain: "gyancmeet.firebaseapp.com",
  projectId: "gyancmeet",
  storageBucket: "gyancmeet.firebasestorage.app",
  messagingSenderId: "646071030759",
  appId: "1:646071030759:web:e5dee2b1520dad5b29a342"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut };
