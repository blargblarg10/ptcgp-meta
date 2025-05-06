import React from 'react';
import { useAuth } from '../context/AuthContext';

const UserProfile = () => {
  const { currentUser, userData, logOut } = useAuth();

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="flex items-center">
      {currentUser.photoURL && (
        <img 
          src={currentUser.photoURL} 
          alt="Profile" 
          className="w-8 h-8 rounded-full mr-2"
          referrerPolicy="no-referrer"
        />
      )}
      <div className="flex flex-col mr-4">
        <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
          {currentUser.displayName || currentUser.email}
        </span>
        {userData && (
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 truncate max-w-[120px]">
              ID: {userData.user_id?.substring(0, 8)}...
            </span>
            <span className="text-xs text-gray-500 truncate max-w-[120px]" title={userData.path_to_json || 'No JSON file'}>
              {userData.path_to_json ? '📄 JSON Attached' : 'No JSON file'}
            </span>
          </div>
        )}
      </div>
      <button
        onClick={handleLogout}
        className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
};

export default UserProfile;