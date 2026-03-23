import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDOkhJdgtSEyRS4SBPUkvNOuHMXvyq1x3s",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "jarvistravelapp.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "jarvistravelapp",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "jarvistravelapp.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "630076196109",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:630076196109:web:7342e5bf5f9b4ffa7c9c44",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Messaging (only in environments that support it)
export const getMessagingInstance = async () => {
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(app);
};

export default app;
