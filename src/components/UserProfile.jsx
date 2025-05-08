import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { loadUserMatchData, saveUserMatchData } from '../utils/firebase';
import { jsonToCsv, csvToJson, validateJsonStructure, downloadFile } from '../utils/dataFormatConverter';

const UserProfile = () => {
  const { currentUser, userData, logOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);
  
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

  const handleDownloadCsv = async () => {
    try {
      setShowDropdown(false);
      const matchData = await loadUserMatchData(userData);
      if (matchData && matchData.length > 0) {
        const csvContent = jsonToCsv(matchData);
        const fileName = `ptcgp_match_data_${new Date().toISOString().split('T')[0]}.csv`;
        downloadFile(csvContent, fileName, 'text/csv');
      } else {
        alert('No match data available to download');
      }
    } catch (error) {
      console.error('Error downloading CSV:', error);
      alert('Failed to download CSV. Please try again.');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
    setShowDropdown(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    
    try {
      const fileContent = await readFileAsText(file);
      const { data, errors } = csvToJson(fileContent);
      
      if (errors && errors.length > 0) {
        setUploadError(`CSV format error: ${errors[0]}`);
        return;
      }
      
      const validation = validateJsonStructure(data);
      if (!validation.valid) {
        setUploadError(`Data validation error: ${validation.errors[0]}`);
        return;
      }
      
      // Confirm before replacing all data
      if (window.confirm('This will replace all your existing match data. Are you sure you want to continue?')) {
        await saveUserMatchData(userData, data);
        alert('Match data successfully uploaded and saved');
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      setUploadError('Failed to upload and process the CSV file');
    } finally {
      setUploading(false);
      // Clear the file input
      e.target.value = '';
    }
  };

  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  if (!currentUser) return null;

  return (
    <div className="relative">
      <button 
        onClick={toggleDropdown}
        className="flex items-center focus:outline-none hover:bg-gray-100 p-1 rounded-md"
        aria-expanded={showDropdown}
        aria-haspopup="true"
      >
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
      </button>
      
      {showDropdown && (
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
      )}
      
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv"
        className="hidden"
      />
      
      {uploadError && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-medium text-red-600 mb-2">Upload Error</h3>
            <p className="text-gray-600 mb-4">{uploadError}</p>
            <button
              onClick={() => setUploadError(null)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {uploading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;