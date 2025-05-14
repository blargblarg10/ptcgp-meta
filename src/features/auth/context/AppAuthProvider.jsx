import React from 'react';
import { AuthProvider } from './AuthContext';
import { UserProvider } from './UserContext';

// Combined provider that wraps both Auth and User providers
export const AppAuthProvider = ({ children }) => {
  return (
    <AuthProvider>
      <UserProvider>
        {children}
      </UserProvider>
    </AuthProvider>
  );
};

export default AppAuthProvider;
