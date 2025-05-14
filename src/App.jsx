import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, useLocation, Link } from 'react-router-dom';
import SubmitData from './features/matches/components/SubmitDataTab';
import YourStats from './features/stats/components/YourStatsTab';
import MetaDataTab from './features/meta-analysis/MetaDataTab';
import Login from './features/auth/components/Login';
import UserProfile from './features/auth/components/UserProfile';
import { useAuth } from './features/auth/context/AuthContext';

// Main App component
const App = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginFromButton, setLoginFromButton] = useState(false);

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
    }
  }, [currentUser, location.pathname, loginFromButton]);

  // Helper function to determine if a path is active
  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-red-600 flex flex-col" style={{ background: '#db0a0a url("./body_bg.png")' }}>
      <div className="w-full max-w-7xl min-w-[320px] mx-auto bg-white flex-1" style={{ background: '#fff url("./tp_bg.png")' }}>
        <div className="bg-gray-50 p-2 border-b border-gray-200">
          <div className="relative">
            <div className="absolute right-0 top-0 flex flex-col items-end">
              <div className="flex items-center gap-3">
                {currentUser ? (
                  <UserProfile />
                ) : (
                  <button
                    onClick={() => {
                      setLoginFromButton(true);
                      setShowLoginModal(true);
                    }}
                    className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
            <header className="py-8 text-center">
              <h1 className="text-3xl text-gray-800 font-bold mb-2">Pokemon Meta</h1>
            </header>
          </div>
          <div className="flex border-b border-gray-200 mb-6">
            <Link 
              to="/"
              className={`px-6 py-3 cursor-pointer font-medium transition duration-200 ${
                isActive('/') 
                  ? 'border-b-3 border-blue-500 text-blue-500' 
                  : 'text-gray-600 hover:text-blue-500'
              }`} 
            >
              Submit Data
            </Link>
            <Link 
              to="/stats"
              className={`px-6 py-3 cursor-pointer font-medium transition duration-200 ${
                isActive('/stats') 
                  ? 'border-b-3 border-blue-500 text-blue-500' 
                  : 'text-gray-600 hover:text-blue-500'
              }`} 
            >
              Your Stats
            </Link>
            <Link 
              to="/metadata"
              className={`px-6 py-3 cursor-pointer font-medium transition duration-200 ${
                isActive('/metadata') 
                  ? 'border-b-3 border-blue-500 text-blue-500' 
                  : 'text-gray-600 hover:text-blue-500'
              }`} 
            >
              Meta Data
            </Link>
          </div>
        </div>
        
        <div className="p-3">
          <Routes>
            <Route path="/" element={<SubmitData />} />
            <Route path="/stats" element={<YourStats />} />
            <Route path="/metadata" element={<MetaDataTab />} />
          </Routes>
        </div>
      </div>
      
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
    </div>
  );
};

export default App;