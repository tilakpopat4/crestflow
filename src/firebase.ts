import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || (typeof process !== 'undefined' ? process.env : {}) || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyDVC84sK2RE7u-Tv-oxtVJCesqTzsyirVo",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "crestflow-14f4b.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "crestflow-14f4b",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "crestflow-14f4b.firebasestorage.app",
  appId: env.VITE_FIREBASE_APP_ID || "1:960977935987:web:9c55663e25a9d8c30a1406",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-5M69302VHW"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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
