// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
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
export const db = getFirestore(app);
