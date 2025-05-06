// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL, getBytes } from 'firebase/storage';

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
export const db = getFirestore(app);
export const storage = getStorage(app);

// Auth providers
const googleProvider = new GoogleAuthProvider();

// Create empty JSON file in storage for new user
export const createUserJsonFile = async (userId) => {
  if (!userId) return null;
  
  // Create empty user data template
  const initialUserData = {
    matches: [],
    decks: [],
    stats: {
      totalMatches: 0,
      wins: 0,
      losses: 0,
      draws: 0
    },
    lastUpdated: new Date().toISOString()
  };
  
  // Path in storage where the file will be stored
  const filePath = `users/${userId}/user_data.json`;
  
  try {
    // Create a reference to the file location in Firebase Storage
    const fileRef = ref(storage, filePath);
    
    // Upload the initial JSON as a string
    await uploadString(fileRef, JSON.stringify(initialUserData, null, 2), 'raw');
    
    // Get the download URL for the file
    const downloadURL = await getDownloadURL(fileRef);
    
    console.log(`Created new JSON file for user ${userId}`);
    
    // Return both the path and URL
    return {
      storagePath: filePath,
      downloadURL
    };
  } catch (error) {
    console.error("Error creating user JSON file:", error);
    throw error;
  }
};

// Alternative implementation: Store user data in Firestore instead of Storage
// This bypasses CORS issues completely
export const loadUserMatchData = async (userData) => {
  if (!userData || !userData.user_id) {
    console.error("No valid user data available");
    return [];
  }
  
  try {
    // Reference to the user document in Firestore
    const userDocRef = doc(db, 'users', userData.user_id);
    
    // Get the document
    const docSnap = await getDoc(userDocRef);
    
    if (!docSnap.exists()) {
      console.error("User document does not exist");
      return [];
    }
    
    // Get the userData object
    const userDocData = docSnap.data();
    
    // Check if we have the matches field already in Firestore
    if (userDocData.matches) {
      return userDocData.matches;
    }
    
    // If not, try to initialize it from Storage once, then store in Firestore for future use
    if (userData.path_to_json) {
      try {
        // Try to get user data from storage once
        const fileRef = ref(storage, userData.path_to_json);
        const bytes = await getBytes(fileRef);
        const text = new TextDecoder().decode(bytes);
        const data = JSON.parse(text);
        
        // Store this in Firestore for future ease of access
        if (data.matches) {
          await updateDoc(userDocRef, {
            matches: data.matches,
            stats: data.stats || {
              totalMatches: 0,
              wins: 0,
              losses: 0,
              draws: 0
            },
            lastUpdated: new Date().toISOString()
          });
          
          return data.matches;
        }
      } catch (storageError) {
        console.error("Could not load from Storage, initializing empty matches array", storageError);
        // Initialize empty matches array in Firestore
        await updateDoc(userDocRef, {
          matches: [],
          stats: {
            totalMatches: 0,
            wins: 0,
            losses: 0,
            draws: 0
          },
          lastUpdated: new Date().toISOString()
        });
      }
    }
    
    return [];
  } catch (error) {
    console.error("Error loading user match data:", error);
    return [];
  }
};

// Also store user match data in Firestore instead of Storage
export const saveUserMatchData = async (userData, matchData) => {
  if (!userData || !userData.user_id) {
    console.error("No user data available");
    return false;
  }
  
  try {
    // Calculate stats
    const stats = {
      totalMatches: matchData.length,
      wins: matchData.filter(game => game.result === "victory").length,
      losses: matchData.filter(game => game.result === "defeat").length,
      draws: matchData.filter(game => game.result === "draw").length
    };
    
    // Update the Firestore document with matches
    const userDocRef = doc(db, 'users', userData.user_id);
    await updateDoc(userDocRef, {
      matches: matchData,
      stats: stats,
      lastUpdated: new Date().toISOString()
    });
    
    // Also update storage for backup if path_to_json exists
    if (userData.path_to_json) {
      try {
        const fileRef = ref(storage, userData.path_to_json);
        const updatedData = {
          matches: matchData,
          decks: [],
          stats: stats,
          lastUpdated: new Date().toISOString()
        };
        await uploadString(fileRef, JSON.stringify(updatedData, null, 2), 'raw');
      } catch (storageError) {
        console.warn("Could not update storage backup, but Firestore update succeeded", storageError);
        // Continue anyway, since the primary copy is in Firestore now
      }
    }
    
    console.log(`Saved match data for user ${userData.user_id}`);
    return true;
  } catch (error) {
    console.error("Error saving user match data:", error);
    return false;
  }
};

// Create or fetch user document in Firestore
export const createOrGetUserDocument = async (user) => {
  if (!user) return null;
  
  // Reference to the user document using their UID as document ID
  const userDocRef = doc(db, 'users', user.uid);
  
  try {
    // Check if user document exists
    const docSnap = await getDoc(userDocRef);
    
    if (docSnap.exists()) {
      // If the document exists, return the user data
      console.log("Found existing user document");
      return docSnap.data();
    } else {
      // If the document doesn't exist, create a new one and a JSON file in storage
      console.log("Creating new user document");
      
      // Create JSON file in storage for backup
      const jsonFileInfo = await createUserJsonFile(user.uid);
      
      const userData = {
        user_id: user.uid,
        name: user.displayName || 'Anonymous User',
        email: user.email || null,
        path_to_json: jsonFileInfo.storagePath,
        json_download_url: jsonFileInfo.downloadURL,
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
      
      // Create the document in Firestore
      await setDoc(userDocRef, userData);
      
      return userData;
    }
  } catch (error) {
    console.error("Error creating/getting user document:", error);
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Create or fetch user document after successful login
    await createOrGetUserDocument(result.user);
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