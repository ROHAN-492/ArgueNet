
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB1GHqaVyrvJG_t7YalKMLQ38NDDeArZqQ",
  authDomain: "arguenet-40f61.firebaseapp.com",
  projectId: "arguenet-40f61",
  storageBucket: "arguenet-40f61.firebasestorage.app",
  messagingSenderId: "1090963176653",
  appId: "1:1090963176653:web:ce483517f86764c2fbbd84",
  measurementId: "G-8GFEX2E6WE"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db_firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
