import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase, ref, onDisconnect, set, serverTimestamp } from 'firebase/database';

// Firebase configuration from environment variables
// Using client-side Firebase SDK (not admin SDK)
const firebaseConfig = {
  apiKey: "AIzaSyBdNpjXs_g9gCub835Ve4bOcy8zBCgVXeU",
  authDomain: "collabsphere-9fb78.firebaseapp.com",
  projectId: "collabsphere-9fb78",
  storageBucket: "collabsphere-9fb78.firebasestorage.app",
  messagingSenderId: "587627144926",
  appId: "1:587627144926:web:4e5cebb3257dca4791c44f",
};

// Validate that all required environment variables are present
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  throw new Error(
    'Missing Firebase configuration. Please set NEXT_PUBLIC_FIREBASE_* environment variables.'
  );
}

// Initialize Firebase (only if not already initialized)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize and export Firebase services
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);
export const database = getDatabase(app);

// Also export as 'db' for backward compatibility
export const db = firestore;

// Set up presence tracking with Realtime Database
if (typeof window !== 'undefined') {
  // Only run on client side
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is logged in - set online status
      const userStatusRef = ref(database, `usersStatus/${user.uid}`);
      
      // Set user as online
      set(userStatusRef, {
        state: 'online',
        lastSeen: serverTimestamp(),
      });

      // Set up disconnect handler
      onDisconnect(userStatusRef).update({
        state: 'offline',
        lastSeen: serverTimestamp(),
      });
    }
  });
}

export default app;

