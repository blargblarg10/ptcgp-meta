import React from 'react';

/**
 * Component for dropdown menu in user profile
 */
const UserProfileMenu = ({ 
  currentUser, 
  userData, 
  handleDownloadCsv, 
  handleUploadClick, 
  handleLogout 
}) => {
  return (
    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
      <div className="px-4 py-2 border-b border-gray-200">
        <div className="text-sm font-medium text-gray-700 truncate">
          {currentUser.displayName || currentUser.email}
        </div>
        {userData && (
          <div className="text-xs text-gray-500 truncate">
            ID: {userData.user_id?.substring(0, 8)}...
          </div>
        )}
      </div>
      
      <button
        onClick={handleDownloadCsv}
        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download CSV
      </button>
      
      <button
        onClick={handleUploadClick}
        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a3 3 0 01-3-3V6a3 3 0 013-3h10a3 3 0 013 3v7a3 3 0 01-3 3H7z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l3-3m0 0l3 3m-3-3v6M9 21h6" />
        </svg>
        Upload CSV
      </button>
      
      <button
        onClick={handleLogout}
        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 border-t border-gray-200 flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Sign Out
      </button>
    </div>
  );
};

export default UserProfileMenu;
