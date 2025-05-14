import React, { useState, useRef } from 'react';
import { useAuthUser } from '../../auth/hooks/useAuthUser';
import { loadUserMatchData, saveUserMatchData } from '../../../services/firebase';
import { 
  convertJsonToCsv, 
  convertCsvToJson, 
  validateJsonStructure, 
  downloadFile,
  validateCsvStructure,
  processImportCsv
} from '../../../services/import-export';

const UserProfile = () => {
  const { currentUser, userData, logOut } = useAuthUser();
  const [showDropdown, setShowDropdown] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadWarnings, setUploadWarnings] = useState([]);
  const [uploadStats, setUploadStats] = useState(null);
  const [showUploadInfo, setShowUploadInfo] = useState(false);
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
        // Add notes header information at the top of the file        
        const notesHeader = 
          "# PTCGP Meta Match Data\n" +
          `# Downloaded on: ${new Date().toLocaleString()}\n` +
          `# User: ${currentUser.displayName || currentUser.email}\n` +
          `# Total Records: ${matchData.length}\n` +
          "# Format: CSV with headers\n" +
          "# Notes: This file contains your match history data. You can edit and re-upload it.\n" +
          "#        - The 'notes' column can be used for your personal match notes\n" +
          "#        - All dates should be in ISO format (YYYY-MM-DDTHH:MM:SS.mmmZ)\n" +
          "#        - Do not modify the ID column values\n\n";
          
        const csvContent = convertJsonToCsv(matchData);
        const fileContent = notesHeader + csvContent;
        const fileName = `ptcgp_match_data_${new Date().toISOString().split('T')[0]}.csv`;
        downloadFile(fileContent, fileName, 'text/csv');
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
    setUploadWarnings([]);
    setUploadStats(null);
    setShowUploadInfo(false);
    
    try {      const fileContent = await readFileAsText(file);
      
      // Use the consolidated processImportCsv function to handle all validation in one call
      const processedResult = processImportCsv(fileContent);
      
      // Set stats for display
      setUploadStats(processedResult.stats);
      
      // Set warnings array
      if (processedResult.warnings && processedResult.warnings.length > 0) {
        setUploadWarnings(processedResult.warnings);
      }
      
      // Check for critical errors
      if (!processedResult.valid || (processedResult.errors && processedResult.errors.length > 0)) {
        // Only show critical errors (missing required fields like timestamp, result, etc.)
        const criticalErrors = processedResult.errors.filter(error => 
          !error.includes('automatically') && 
          !error.includes('Missing ID field') && 
          !error.includes('Missing isLocked field') &&
          !error.includes('Missing notes field')
        );
        
        if (criticalErrors.length > 0) {
          setUploadError(`Data validation error: ${criticalErrors[0]}`);
          if (criticalErrors.length > 1) {
            setUploadWarnings(prevWarnings => [
              ...prevWarnings,
              ...criticalErrors.slice(1, 5),
              criticalErrors.length > 5 ? `And ${criticalErrors.length - 5} more errors...` : null
            ].filter(Boolean));
          }
          setShowUploadInfo(true);
          return;
        }
      }
      
      // Always show the info dialog for user awareness
      setShowUploadInfo(true);
      
      // Use the processed data with added fields
      const finalData = processedResult.data;
      
      // Confirm before replacing all data
      if (window.confirm(`This will replace all your existing match data with ${finalData.length} records. Are you sure you want to continue?`)) {
        await saveUserMatchData(userData, finalData);
        alert('Match data successfully uploaded and saved');
        setShowUploadInfo(false);
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
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(107, 114, 128, 0.25)' }}>
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-medium text-red-600 mb-2">Upload Error</h3>
            <div className="text-gray-600 mb-4">
              <p className="mb-2">{uploadError.split(' - ')[0]}</p>
              {uploadError.includes(' - Field:') && (
                <div className="mt-2 bg-red-50 p-3 rounded border border-red-200">
                  <p className="font-medium text-red-700 text-sm">Error Details:</p>
                  <div className="mt-1 grid grid-cols-3 gap-1 text-sm">
                    <div className="font-medium">Field:</div>
                    <div className="col-span-2">{uploadError.split('Field: ')[1]?.split(',')[0]}</div>
                    
                    <div className="font-medium">Value:</div>
                    <div className="col-span-2 font-mono text-red-800 break-all">
                      {uploadError.split('Value: ')[1]}
                    </div>
                  </div>
                </div>
              )}
            </div>
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
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(107, 114, 128, 0.25)' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {showUploadInfo && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(107, 114, 128, 0.25)' }}>
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-medium text-blue-600 mb-2">CSV Upload Information</h3>
            
            {uploadStats && (
              <div className="mb-4 bg-gray-50 p-3 rounded border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-1">File Statistics:</h4>
                <ul className="text-sm text-gray-600">
                  <li>Total records: {uploadStats.rowCount}</li>
                  {uploadStats.headerCount && <li>Columns: {uploadStats.headerCount}</li>}
                  {uploadStats.missingHeadersCount > 0 && (
                    <li className="text-yellow-600">Missing headers: {uploadStats.missingHeadersCount}</li>
                  )}
                  {uploadStats.unexpectedHeadersCount > 0 && (
                    <li className="text-yellow-600">Extra headers: {uploadStats.unexpectedHeadersCount}</li>
                  )}
                </ul>
              </div>
            )}
            
            {uploadWarnings.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-yellow-600 mb-1">Warnings:</h4>
                <ul className="text-sm text-gray-600 max-h-60 overflow-y-auto bg-yellow-50 p-3 rounded border border-yellow-200">
                  {uploadWarnings.map((warning, index) => (
                    <li key={index} className="mb-2 pb-2 border-b border-yellow-100 last:border-b-0">
                      {warning.includes(' - Field:') ? (
                        <div>
                          <p className="font-medium">{warning.split(' - ')[0]}</p>
                          <div className="mt-1 ml-2 grid grid-cols-3 gap-1 text-sm">
                            <div className="font-medium">Field:</div>
                            <div className="col-span-2">{warning.split('Field: ')[1]?.split(',')[0]}</div>
                            
                            <div className="font-medium">Value:</div>
                            <div className="col-span-2 font-mono text-yellow-800 break-all">
                              {warning.split('Value: ')[1]}
                            </div>
                          </div>
                        </div>
                      ) : (
                        warning
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex justify-end mt-2">
              <button
                onClick={() => setShowUploadInfo(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
