import React, { useState, useEffect } from 'react';
import MatchEntry from './MatchEntryRender';
import { useAuth } from '../context/AuthContext';
import { loadUserMatchData, saveUserMatchData } from '../utils/firebase';

// Cookie utilities for saving and loading unsubmitted entries
const COOKIE_NAME = 'ptcgp_unsubmitted_entries';

// Save entries to cookies
const saveEntriesToCookies = (entries) => {
  try {
    const serialized = JSON.stringify(entries);
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(serialized)};path=/;max-age=604800;SameSite=Strict`; // 7 days expiry
  } catch (error) {
    console.error('Error saving entries to cookies:', error);
  }
};

// Load entries from cookies
const loadEntriesFromCookies = () => {
  try {
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${COOKIE_NAME}=`))
      ?.split('=')[1];
      
    if (cookieValue) {
      return JSON.parse(decodeURIComponent(cookieValue)) || [];
    }
  } catch (error) {
    console.error('Error loading entries from cookies:', error);
  }
  return [];
};

// Clear cookie
const clearEntriesCookie = () => {
  document.cookie = `${COOKIE_NAME}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT;SameSite=Strict`;
};

// Initial batch row state
const initialBatchRow = {
  yourDeck: {
    primary: null,    // Will store just the key
    secondary: null   // Will store just the key
  },
  opponentDeck: {
    primary: null,    // Will store just the key
    secondary: null   // Will store just the key
  },
  turnOrder: null,
  result: "none",
  isLocked: false
};

// Helper function to create a new batch row
const createBatchRow = (existingRow = null) => ({
  ...initialBatchRow,
  id: `new-${Date.now()}`,
  yourDeck: existingRow ? { ...existingRow.yourDeck } : { ...initialBatchRow.yourDeck },
  opponentDeck: existingRow ? { ...existingRow.opponentDeck } : { ...initialBatchRow.opponentDeck },
  result: 'none',
  isLocked: false,
  timestamp: new Date().toISOString()
});

const MatchResultTracker = () => {
  // State
  const { currentUser, userData } = useAuth();
  const [matches, setMatches] = useState([]);
  const [batchEntries, setBatchEntries] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const matchesPerPage = 20;

  // Calculate pagination values
  const indexOfLastMatch = currentPage * matchesPerPage;
  const indexOfFirstMatch = indexOfLastMatch - matchesPerPage;
  const currentMatches = matches.slice(indexOfFirstMatch, indexOfLastMatch);
  const totalPages = Math.ceil(matches.length / matchesPerPage);

  // Initialize batch entries from cookies or create a new one
  useEffect(() => {
    const savedEntries = loadEntriesFromCookies();
    if (savedEntries && savedEntries.length > 0) {
      // Ensure timestamps are up to date
      const entriesWithUpdatedTimestamps = savedEntries.map(entry => ({
        ...entry,
        timestamp: entry.timestamp || new Date().toISOString()
      }));
      setBatchEntries(entriesWithUpdatedTimestamps);
      console.log('Loaded unsubmitted entries from cookies:', entriesWithUpdatedTimestamps.length);
    } else {
      setBatchEntries([createBatchRow()]);
    }
  }, []);

  // Save batch entries to cookies whenever they change
  useEffect(() => {
    if (batchEntries.length > 0) {
      saveEntriesToCookies(batchEntries);
    }
  }, [batchEntries]);

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Load match data on component mount or when userData changes
  useEffect(() => {
    const loadMatches = async () => {
      setLoading(true);
      try {
        if (userData) {
          const data = await loadUserMatchData(userData);
          // Sort matches by timestamp, newest first
          setMatches(data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        } else {
          setMatches([]);
        }
      } catch (error) {
        console.error('Error loading match data:', error);
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadMatches();
  }, [userData]);

  // Save match data to Firebase
  const saveMatchDataToFirebase = async (updatedMatches) => {
    if (!userData) return;
    
    try {
      await saveUserMatchData(userData, updatedMatches);
    } catch (error) {
      console.error('Error saving match data:', error);
    }
  };

  // Add a new batch row
  const addBatchRow = () => {
    const firstRow = batchEntries[0];
    const newRow = createBatchRow(firstRow);
    setBatchEntries([newRow, ...batchEntries]);
  };

  // Remove a batch entry
  const removeEntry = async (id) => {
    if (id.startsWith('match-')) {
      const updatedMatches = matches.filter(match => match.id !== id);
      setMatches(updatedMatches);
      await saveMatchDataToFirebase(updatedMatches);
      if (editingId === id) {
        setEditingId(null);
      }
      return;
    }
    
    if (batchEntries.length === 1 && !matches.some(m => m.isLocked)) {
      return;
    }
    
    const updatedEntries = batchEntries.filter(entry => entry.id !== id);
    setBatchEntries(updatedEntries);
    
    // If removing the last entry, clear cookies
    if (updatedEntries.length === 0) {
      clearEntriesCookie();
    }
  };

  // Toggle edit mode for a match entry
  const toggleEditMode = (id) => {
    if (editingId && editingId !== id) {
      saveEdit(editingId);
    }
    
    if (editingId === id) {
      saveEdit(id);
    } else {
      setEditingId(id);
    }
  };

  // Save edited entry
  const saveEdit = async (id) => {
    const updatedMatches = matches.map(match => {
      if (match.id === id) {
        return { ...match, isLocked: true };
      }
      return match;
    });
    setMatches(updatedMatches);
    await saveMatchDataToFirebase(updatedMatches);
    setEditingId(null);
  };

  // Handle change to a batch entry field
  const handleBatchEntryChange = (id, field, value) => {
    const entryIndex = batchEntries.findIndex(entry => entry.id === id);
    
    if (entryIndex === -1) {
      const updatedMatches = matches.map(match => {
        if (match.id === id) {
          if (field.includes('.')) {
            const [parent, child] = field.split('.');
            return {
              ...match,
              [parent]: {
                ...match[parent],
                [child]: value
              }
            };
          }
          
          return {
            ...match,
            [field]: value
          };
        }
        return match;
      });
      
      setMatches(updatedMatches);
      
      if (formErrors[id]?.[field]) {
        setFormErrors({
          ...formErrors,
          [id]: {
            ...formErrors[id],
            [field]: null
          }
        });
      }
      
      return;
    }
    
    const updatedEntries = [...batchEntries];
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      updatedEntries[entryIndex] = {
        ...updatedEntries[entryIndex],
        [parent]: {
          ...updatedEntries[entryIndex][parent],
          [child]: value
        }
      };
    } else {
      updatedEntries[entryIndex] = {
        ...updatedEntries[entryIndex],
        [field]: value
      };
    }
    
    setBatchEntries(updatedEntries);
    
    if (formErrors[id]?.[field]) {
      setFormErrors({
        ...formErrors,
        [id]: {
          ...formErrors[id],
          [field]: null
        }
      });
    }
  };

  // Validate form before submission
  const validateForm = () => {
    let isValid = true;
    const errors = {};

    [...batchEntries, ...matches.filter(m => m.id === editingId)].forEach(entry => {
      const entryErrors = {};
      
      if (!entry.yourDeck.primary) {
        entryErrors['yourDeck.primary'] = 'Required';
        isValid = false;
      }
      
      if (!entry.opponentDeck.primary) {
        entryErrors['opponentDeck.primary'] = 'Required';
        isValid = false;
      }
      
      if (entry.result === 'none') {
        entryErrors['result'] = 'Required';
        isValid = false;
      }
      
      if (entry.turnOrder === null) {
        entryErrors['turnOrder'] = 'Required';
        isValid = false;
      }
      
      if (Object.keys(entryErrors).length > 0) {
        errors[entry.id] = entryErrors;
      }
    });

    setFormErrors(errors);
    return isValid;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (editingId) {
      await saveEdit(editingId);
    }

    // Prepare new matches data
    const newMatches = batchEntries.map(entry => ({
      ...entry,
      id: entry.id.startsWith('new-') ? `match-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` : entry.id,
      isLocked: true
    }));

    try {
      // Add loading cursor without hiding the UI
      document.body.style.cursor = 'wait';
      
      // Create updated matches array but don't update state yet
      const updatedMatches = [...newMatches, ...matches];
      
      // Sort matches by timestamp, newest first
      const sortedMatches = updatedMatches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Save to Firebase first
      await saveMatchDataToFirebase(sortedMatches);
      
      // Only update the match history after the save is successful
      setMatches(sortedMatches);
      
      // Then reset the submission form
      setBatchEntries([createBatchRow()]);
      
      // Clear the cookie after successful submission
      clearEntriesCookie();
      
      setFormErrors({});
    } catch (error) {
      console.error('Error saving match data:', error);
      // Display an error message to the user
      alert('Failed to save match data. Please try again.');
    } finally {
      // Reset cursor back to normal
      document.body.style.cursor = 'default';
    }
  };

  // If not logged in, prompt user to sign in
  if (!currentUser) {
    return (
      <div className="max-w-[1400px] mx-auto p-4">
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <h2 className="text-xl font-semibold text-blue-800 mb-3">Sign in to Track Match Results</h2>
          <p className="text-blue-600 mb-4">
            Please sign in to save and track your match results. Your data will be securely stored in your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto p-4">     
      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div>      
          <div className="mb-8">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={addBatchRow}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                + Add Row
              </button>
            </div>
            <div className="mb-4"></div>
            
            {batchEntries.map(entry => (
              <MatchEntry
                key={entry.id}
                entry={entry}
                isEditing={editingId === entry.id}
                onEdit={toggleEditMode}
                onRemove={removeEntry}
                onFieldChange={handleBatchEntryChange}
                formErrors={formErrors}
                matchHistory={matches}
              />
            ))}
            
            <button
              type="button"
              onClick={handleSubmit}
              className="mt-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Submit All
            </button>
          </div>
          
          {matches.length > 0 && (
            <div>
              <h1 className="text-2xl font-bold mb-6">Match History</h1>
              {currentMatches.map(match => (
                <MatchEntry
                  key={match.id}
                  entry={match}
                  isEditing={editingId === match.id}
                  onEdit={toggleEditMode}
                  onRemove={removeEntry}
                  onFieldChange={handleBatchEntryChange}
                  formErrors={formErrors}
                  matchHistory={matches}
                />
              ))}

              {totalPages > 1 && (
                <div className="flex justify-center mt-4 items-center gap-2">
                  <span className="text-gray-600">Page:</span>
                  <select
                    value={currentPage}
                    onChange={(e) => handlePageChange(Number(e.target.value))}
                    className="px-3 pr-8 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left appearance-none"
                    style={{ textAlignLast: 'left', minWidth: '4rem' }}
                  >
                    {[...Array(totalPages)].map((_, index) => (
                      <option key={index + 1} value={index + 1} className="text-left">
                        {index + 1}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-600">of {totalPages}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MatchResultTracker;