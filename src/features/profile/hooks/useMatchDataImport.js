/**
 * Hook to handle match data import functionality
 */
import { useState } from 'react';
import { useAuthUser } from '../../auth/hooks/useAuthUser';
import { saveUserMatchData } from '../../../services/firebase';
import { processImportCsv } from '../../../services/import-export';

export const useMatchDataImport = () => {
  const { userData } = useAuthUser();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadWarnings, setUploadWarnings] = useState([]);
  const [uploadStats, setUploadStats] = useState(null);
  const [showUploadInfo, setShowUploadInfo] = useState(false);

  const resetUploadState = () => {
    setUploadError(null);
    setUploadWarnings([]);
    setUploadStats(null);
    setShowUploadInfo(false);
  };

  const handleImportData = async (fileContent) => {
    setUploading(true);
    resetUploadState();
    
    try {
      // Process and validate the CSV data
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
          return null;
        }
      }
      
      // Always show the info dialog for user awareness
      setShowUploadInfo(true);
      
      return processedResult.data;
    } catch (error) {
      console.error('Error processing CSV:', error);
      setUploadError('Failed to process the CSV file');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const saveImportedData = async (data) => {
    try {
      await saveUserMatchData(userData, data);
      return true;
    } catch (error) {
      console.error('Error saving data:', error);
      setUploadError('Failed to save the data to your profile');
      return false;
    }
  };

  // Helper to read a file as text
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  return {
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
  };
};
