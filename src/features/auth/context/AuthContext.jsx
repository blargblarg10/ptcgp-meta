import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, signInWithGoogle, logOut, subscribeToAuthChanges, createOrGetUserDocument } from '../../../services/firebase';

// Create auth context
const AuthContext = createContext(null);

// Custom hook to use auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Auth context provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      setCurrentUser(user);
      
      // If user is logged in, create or get their document
      if (user) {
        try {
          const userDoc = await createOrGetUserDocument(user);
          setUserData(userDoc);
        } catch (error) {
          console.error("Error setting up user document:", error);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Auth context values
  const value = {
    currentUser,
    userData,
    loading,
    signInWithGoogle,
    logOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Also export as default for flexibility
export default { AuthProvider, useAuth };