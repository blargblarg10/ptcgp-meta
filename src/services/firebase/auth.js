// Authentication service
import { signInWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './config';

// Auth providers
const googleProvider = new GoogleAuthProvider();

/**
 * Creates a new user data object from a Firebase Auth user
 * @param {Object} user - Firebase Auth user object
 * @returns {Object} User data object
 */
const createNewUserData = (user) => {
  return {
    user_id: user.uid,
    name: user.displayName || 'Anonymous User',
    email: user.email || null,
    photoURL: user.photoURL || null,
    createdAt: new Date().toISOString(),
    matches: [],
    stats: {
      totalMatches: 0,
      wins: 0,
      losses: 0,
      draws: 0
    },
    lastUpdated: new Date().toISOString()
  };
};

/**
 * Creates or retrieves a user document from Firestore
 * @param {Object} user - Firebase Auth user object
 * @returns {Object|null} User document data or null
 */
export const createOrGetUserDocument = async (user) => {
  if (!user) return null;
  
  // Reference to the user document using their UID as document ID
  const userDocRef = doc(db, 'users', user.uid);
  
  try {
    // Check if user document exists
    const docSnap = await getDoc(userDocRef);
    
    if (docSnap.exists()) {
      // If the document exists, return the user data
      return docSnap.data();
    } else {
      // If the document doesn't exist, create a new one
      const userData = createNewUserData(user);
      
      // Create the document in Firestore
      await setDoc(userDocRef, userData);
      
      return userData;
    }
  } catch (error) {
    console.error("Error creating/getting user document:", error);
    throw error;
  }
};

/**
 * Signs in a user with Google
 * @returns {Object|null} Firebase Auth user object or null if cancelled
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Create or fetch user document after successful login
    await createOrGetUserDocument(result.user);
    return result.user;
  } catch (error) {
    // Check if this is a popup cancelled error, which is expected when user closes the popup
    if (error.code === 'auth/popup-closed-by-user') {
      console.log('User closed the Google sign-in popup');
      return null; // Return null instead of throwing for this specific error
    }
    
    console.error("Error signing in with Google", error);
    throw error;
  }
};

/**
 * Signs out the current user
 */
export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

/**
 * Subscribes to Firebase auth state changes
 * @param {Function} callback - Function to call when auth state changes
 * @returns {Function} Unsubscribe function
 */
export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};
