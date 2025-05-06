// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';

// Your Firebase configuration
// Replace with your actual Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyCJ0XX6RUr67ljgOmSl2WISCehsjRPHs9Q",
    authDomain: "ptcgp-meta.firebaseapp.com",
    projectId: "ptcgp-meta",
    storageBucket: "ptcgp-meta.firebasestorage.app",
    messagingSenderId: "684941349891",
    appId: "1:684941349891:web:2b710b9501a4e54d49ea36",
    measurementId: "G-M7Q75RQY72"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Auth providers
const googleProvider = new GoogleAuthProvider();

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

// Sign out
export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

// Track auth state
export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};