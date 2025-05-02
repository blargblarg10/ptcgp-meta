import React from 'react';
import { useNavigate, Routes, Route, useLocation, Link } from 'react-router-dom';
import SubmitData from './components/SubmitDataTab';
import YourStats from './components/YourStatsTab';
import MetaDataTab from './components/MetaDataTab';
import { useFileSystem } from './utils/fileSystemUtils';

// Main App component
const App = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { fileHandle, loadError, errorMessage, handleFileSelect } = useFileSystem();

  // Helper function to determine if a path is active
  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-red-600 flex flex-col" style={{ background: '#db0a0a url("./body_bg.png")' }}>
      <div className="w-full max-w-7xl min-w-[320px] mx-auto bg-white flex-1" style={{ background: '#fff url("./tp_bg.png")' }}>
        <div className="bg-gray-50 p-5 border-b border-gray-200">
          <div className="relative">
            <div className="absolute right-0 top-0 flex flex-col items-end">
              <button
                onClick={handleFileSelect}
                className={`px-4 py-2 rounded-md border transition-colors ${
                  loadError 
                    ? 'border-red-500 text-red-500 hover:bg-red-50'
                    : 'border-blue-500 text-blue-500 hover:bg-blue-50'
                }`}
                title={errorMessage}
              >
                {fileHandle ? 'Change Data File' : 'Select Data File'}
              </button>
              {errorMessage && (
                <span className="text-xs text-red-500 mt-1">{errorMessage}</span>
              )}
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
              Submit Your Data
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
        
        <div className="p-5">
          <Routes>
            <Route path="/" element={<SubmitData fileHandle={fileHandle} />} />
            <Route path="/stats" element={<YourStats fileHandle={fileHandle} />} />
            <Route path="/metadata" element={<MetaDataTab />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default App;