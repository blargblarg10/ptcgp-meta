/**
 * Hook to handle match data export functionality
 */
import { useAuthUser } from '../../auth/hooks/useAuthUser';
import { loadUserMatchData } from '../../../services/firebase';
import { convertJsonToCsv, downloadFile } from '../../../services/import-export';

export const useMatchDataExport = () => {
  const { currentUser, userData } = useAuthUser();

  const handleDownloadCsv = async () => {
    try {
      const matchData = await loadUserMatchData(userData);
      if (matchData && matchData.length > 0) {
        // Add notes header information at the top of the file
        const notesHeader = createNotesHeader(matchData.length, currentUser);
        
        const csvContent = convertJsonToCsv(matchData);
        const fileContent = notesHeader + csvContent;
        const fileName = `ptcgp_match_data_${new Date().toISOString().split('T')[0]}.csv`;
        downloadFile(fileContent, fileName, 'text/csv');
        return { success: true };
      } else {
        return { 
          success: false, 
          error: 'No match data available to download' 
        };
      }
    } catch (error) {
      console.error('Error downloading CSV:', error);
      return { 
        success: false, 
        error: 'Failed to download CSV. Please try again.' 
      };
    }
  };

  // Helper function to create the CSV header notes
  const createNotesHeader = (recordCount, user) => {
    return (
      "# PTCGP Meta Match Data\n" +
      `# Downloaded on: ${new Date().toLocaleString()}\n` +
      `# User: ${user.displayName || user.email}\n` +
      `# Total Records: ${recordCount}\n` +
      "# Format: CSV with headers\n" +
      "# Notes: This file contains your match history data. You can edit and re-upload it.\n" +
      "#        - The 'notes' column can be used for your personal match notes\n" +
      "#        - All dates should be in ISO format (YYYY-MM-DDTHH:MM:SS.mmmZ)\n" +
      "#        - Do not modify the ID column values\n\n"
    );
  };

  return {
    handleDownloadCsv
  };
};
