import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithGoogle, logOut, subscribeToAuthChanges } from '../../../services/firebase';

// Create auth context
const AuthContext = createContext(null);

// Custom hook to use auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Auth context provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = subscribeToAuthChanges((user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Auth context values
  const value = {
    currentUser,
    loading,
    signInWithGoogle,
    logOut
  };

  return (    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Export default for flexibility, but without the object wrapper
export default AuthProvider;