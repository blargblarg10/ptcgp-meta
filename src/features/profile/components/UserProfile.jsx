import React, { useRef } from 'react';
import UserAvatar from './UserAvatar';
import UserProfileMenu from './UserProfileMenu';
import ErrorDialog from './dialogs/ErrorDialog';
import UploadInfoDialog from './dialogs/UploadInfoDialog';
import LoadingIndicator from './dialogs/LoadingIndicator';
import { useUserProfileDropdown } from '../hooks/useUserProfileDropdown';
import { useMatchDataExport } from '../hooks/useMatchDataExport';
import { useMatchDataImport } from '../hooks/useMatchDataImport';

/**
 * User profile component with dropdown menu for account-related actions
 */
const UserProfile = () => {
  // Use custom hooks for state and behavior
  const { 
    currentUser, 
    userData, 
    showDropdown, 
    toggleDropdown, 
    handleLogout,
    closeDropdown
  } = useUserProfileDropdown();
  
  const { handleDownloadCsv } = useMatchDataExport();
  
  const {
    uploading,
    uploadError,
    uploadWarnings,
    uploadStats,
    showUploadInfo,
    setUploadError,
    setShowUploadInfo,
    handleImportData,
    saveImportedData,
    readFileAsText,
    resetUploadState
  } = useMatchDataImport();
  
  const fileInputRef = useRef(null);

  // Handler for file upload button click
  const handleUploadClick = () => {
    fileInputRef.current.click();
    closeDropdown();
  };

  // Handler for file upload changes
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      // Read file content
      const fileContent = await readFileAsText(file);
      
      // Process the data
      const processedData = await handleImportData(fileContent);
      
      // If data was processed successfully
      if (processedData) {
        // Confirm before replacing all data
        if (window.confirm(`This will replace all your existing match data with ${processedData.length} records. Are you sure you want to continue?`)) {
          const saved = await saveImportedData(processedData);
          if (saved) {
            alert('Match data successfully uploaded and saved');
            setShowUploadInfo(false);
          }
        }
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      setUploadError('Failed to upload and process the CSV file');
    } finally {
      // Clear the file input
      e.target.value = '';
    }
  };

  // Handle download with feedback
  const handleDownload = async () => {
    closeDropdown();
    const result = await handleDownloadCsv();
    if (!result.success) {
      alert(result.error);
    }
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
        <UserAvatar currentUser={currentUser} showDropdown={showDropdown} />
      </button>
      
      {showDropdown && (
        <UserProfileMenu 
          currentUser={currentUser}
          userData={userData}
          handleDownloadCsv={handleDownload}
          handleUploadClick={handleUploadClick}
          handleLogout={handleLogout}
        />
      )}
      
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv"
        className="hidden"
      />
      
      {uploadError && (
        <ErrorDialog 
          error={uploadError}
          onClose={() => setUploadError(null)}
        />
      )}
      
      {uploading && <LoadingIndicator />}

      {showUploadInfo && (
        <UploadInfoDialog 
          stats={uploadStats}
          warnings={uploadWarnings}
          onClose={() => setShowUploadInfo(false)}
        />
      )}
    </div>
  );
};

export default UserProfile;
