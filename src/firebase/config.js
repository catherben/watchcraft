import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC3hLYuoagynZXZXRtwmxpz6ab09HDtJCY",
  authDomain: "watchcraft-eb336.firebaseapp.com",
  projectId: "watchcraft-eb336",
  storageBucket: "watchcraft-eb336.firebasestorage.app",
  messagingSenderId: "276476251684",
  appId: "1:276476251684:web:e4fe748b170b42b04e92b1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


// Initialize Firestore
export const db = getFirestore(app);
export default app;