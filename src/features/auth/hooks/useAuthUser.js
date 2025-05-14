import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';

/**
 * Custom hook that combines auth and user data for components that need both
 * @returns {Object} Combined auth and user context data
 */
export const useAuthUser = () => {
  const auth = useAuth();
  const user = useUser();
  
  return {
    // Auth context
    currentUser: auth.currentUser,
    loading: auth.loading || user.loading,
    signInWithGoogle: auth.signInWithGoogle,
    logOut: auth.logOut,
    
    // User context
    userData: user.userData
  };
};
