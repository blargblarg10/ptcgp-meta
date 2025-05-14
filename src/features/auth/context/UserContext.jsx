import React, { createContext, useContext, useState, useEffect } from 'react';
import { createOrGetUserDocument } from '../../../services/firebase';
import { useAuth } from './AuthContext';

// Create user context
const UserContext = createContext(null);

// Custom hook to use user context
export const useUser = () => {
  return useContext(UserContext);
};

// User context provider component
export const UserProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (currentUser) {
          const userDoc = await createOrGetUserDocument(currentUser);
          setUserData(userDoc);
        } else {
          setUserData(null);
        }
      } catch (error) {
        console.error("Error setting up user document:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser]);

  // User context values
  const value = {
    userData,
    loading
  };

  return (    <UserContext.Provider value={value}>
      {!loading && children}
    </UserContext.Provider>
  );
};

export default UserProvider;
