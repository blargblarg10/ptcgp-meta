import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Login from './Login';
import { useAuth } from '../context/AuthContext';

const LoginModal = () => {
  const location = useLocation();
  const { currentUser, signInWithGoogle } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginFromButton, setLoginFromButton] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Close login modal when user successfully logs in
  useEffect(() => {
    if (currentUser && showLoginModal) {
      setShowLoginModal(false);
      setLoginFromButton(false);
    }
  }, [currentUser, showLoginModal]);

  // Show login modal by default for non-authenticated users on Submit Data or Stats tabs
  useEffect(() => {
    if (!currentUser) {
      if (location.pathname === '/' || location.pathname === '/stats') {
        setShowLoginModal(true);
      } else if (location.pathname === '/metadata' && !loginFromButton) {
        // Hide login modal when navigating to metadata tab unless it was opened by button click
        setShowLoginModal(false);
      }
    }  }, [currentUser, location.pathname, loginFromButton]);
  // Handle direct Google sign-in
  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      await signInWithGoogle();
      // No need to hide modal here as it will be handled by the useEffect
    } catch (error) {
      setError('Failed to sign in with Google. Please try again.');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      {/* Sign In Button (shown when user is not logged in) */}
      {!currentUser && (
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex items-center justify-center bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 mr-2" />
          <span>Sign In</span>
        </button>
      )}
      
      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
          <div className="w-full max-w-md pointer-events-auto">
            <div className="relative shadow-lg">
              <button 
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-800 z-10"
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginFromButton(false);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <Login />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginModal;
