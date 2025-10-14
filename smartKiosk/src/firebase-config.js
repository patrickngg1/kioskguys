import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// **IMPORTANT: Your actual configuration from the HTML file**
const firebaseConfig = {
  apiKey: 'AIzaSyB96NREDjjL73nmLmOsTMwcJqTlOnF6oxE',
  authDomain: 'kiosk-5b741.firebaseapp.com',
  projectId: 'kiosk-5b741',
  storageBucket: 'kiosk-5b741.firebasestorage.app',
  messagingSenderId: '715474338207',
  appId: '1:715474338207:web:91556c3cc0fb47925e3daa',
  measurementId: 'G-LF4DSPL368',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
