// Import Firebase SDK
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // If using file uploads

// Your Firebase config (replace with your actual keys)
const firebaseConfig = {
  apiKey: "AIzaSyCl-_vYyEZMRwwB5ObRZc3_35tG2fUVa5M",
  authDomain: "pitch-chat-d79ff.firebaseapp.com",
  projectId: "pitch-chat-d79ff",
  storageBucket: "pitch-chat-d79ff.firebasestorage.app",
  messagingSenderId: "527676993056",
  appId: "1:527676993056:web:be01c531522191b6f85645",
  measurementId: "G-R0FZSVQMMP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
