// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA6esBRjh-8q2tWrioxpGwsbVJrntrFQRI",
  authDomain: "personalized-learning-hack.firebaseapp.com",
  projectId: "personalized-learning-hack",
  storageBucket: "personalized-learning-hack.firebasestorage.app",
  messagingSenderId: "538583241986",
  appId: "1:538583241986:web:873697b435799317c1de1b",
  measurementId: "G-BSB4RDFC8C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { app, analytics, auth, db };
