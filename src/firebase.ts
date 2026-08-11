import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDVC84sK2RE7u-Tv-oxtVJCesqTzsyirVo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "crestflow-14f4b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "crestflow-14f4b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "crestflow-14f4b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "960977935987",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:960977935987:web:9c55663e25a9d8c30a1406",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5M69302VHW"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.compose');

export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, '_connection_test', 'ping'));
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (msg.includes('offline') || msg.includes('backend') || msg.includes('10 seconds')) {
      console.warn("Firestore operating in offline or fallback mode.");
    }
  }
}

testFirestoreConnection();
