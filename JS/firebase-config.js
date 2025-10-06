// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// TODO: Add your own Firebase configuration from your project settings
const firebaseConfig = {
  apiKey: "AIzaSyA2TKPX7Lic8j97X67mbig5X2vf1VE8Kjo",
  authDomain: "smart-kiosk-ersa.firebaseapp.com",
  projectId: "smart-kiosk-ersa",
  storageBucket: "smart-kiosk-ersa.firebasestorage.app",
  messagingSenderId: "890444390815",
  appId: "1:890444390815:web:87115af3446658a6fe9daa",
  measurementId: "G-L7E809PK5C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services you'll need in other files
export const auth = getAuth(app);
export const db = getFirestore(app);