/**
 * Hook to manage profile dropdown menu state
 */
import { useState } from 'react';
import { useAuthUser } from '../../auth/hooks/useAuthUser';

export const useUserProfileDropdown = () => {
  const { currentUser, userData, logOut } = useAuthUser();
  const [showDropdown, setShowDropdown] = useState(false);
  
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleLogout = async () => {
    try {
      await logOut();
      setShowDropdown(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const closeDropdown = () => {
    setShowDropdown(false);
  };

  return {
    currentUser,
    userData,
    showDropdown,
    toggleDropdown,
    handleLogout,
    closeDropdown
  };
};
