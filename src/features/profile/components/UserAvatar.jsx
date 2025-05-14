import React from 'react';

/**
 * Component for displaying user avatar
 */
const UserAvatar = ({ currentUser, showDropdown }) => {
  return (
    <>
      {currentUser.photoURL ? (
        <img 
          src={currentUser.photoURL} 
          alt="Profile" 
          className="w-8 h-8 rounded-full mr-1"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white mr-1">
          {(currentUser.displayName || currentUser.email || '?').charAt(0).toUpperCase()}
        </div>
      )}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${showDropdown ? 'transform rotate-180' : ''}`} 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </>
  );
};

export default UserAvatar;
