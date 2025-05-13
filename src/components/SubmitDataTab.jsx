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
    secondary: null,   // Will store just the key
    variant: null     // Will store just the key
  },
  opponentDeck: {
    primary: null,    // Will store just the key
    secondary: null,   // Will store just the key
    variant: null     // Will store just the key
  },
  turnOrder: null,
  result: "none",
  isLocked: false,
  points: 0,          // Default points to 0
  auto: true          // Default auto to true
};

// Helper function to create a new batch row
const createBatchRow = (existingRow = null, matchHistory = []) => {  // Priority order:
  // 1. Use existingRow's yourDeck if available
  // 2. Otherwise use most recent match from history
  // 3. Default to initialBatchRow if nothing else is available
  let yourDeck = { ...initialBatchRow.yourDeck };
  let points = initialBatchRow.points;
  let auto = initialBatchRow.auto;
  let result = 'none';
  
  // Determine previous points from matches or existing row
  const prevPoints = matchHistory.length > 0 ? matchHistory[0].points : 
                     existingRow ? existingRow.points : initialBatchRow.points;
  
  if (existingRow) {
    // Priority 1: Use existing row if provided
    yourDeck = { ...existingRow.yourDeck };
    auto = existingRow.auto !== undefined ? existingRow.auto : initialBatchRow.auto;
    result = existingRow.result !== undefined ? existingRow.result : initialBatchRow.result;
  } else if (matchHistory && matchHistory.length > 0) {
    // Priority 2: Find the most recent match with yourDeck data
    const recentMatch = matchHistory.find(match => match.yourDeck && match.yourDeck.primary);
    if (recentMatch) {
      yourDeck = { ...recentMatch.yourDeck };
      auto = recentMatch.auto !== undefined ? recentMatch.auto : initialBatchRow.auto;
    }
  }
  
  // Calculate points based on auto setting, previous points, and result
  if (auto) {
    if (result === 'victory') {
      points = prevPoints + 10;
    } else if (result === 'defeat') {
      points = prevPoints - 7;
    } else {
      points = prevPoints;
    }
  } else if (existingRow && existingRow.points !== undefined) {
    points = existingRow.points;
  } else {
    points = initialBatchRow.points;
  }
  
  // Priority 3: Default to null (already set in yourDeck initialization)
  
  return {
    ...initialBatchRow,
    id: `new-${Date.now()}`,
    yourDeck,
    opponentDeck: { ...initialBatchRow.opponentDeck },
    result,
    isLocked: false,
    timestamp: new Date().toISOString(),
    points,
    auto
  };
};

const MatchResultTracker = () => {
  // State
  const { currentUser, userData } = useAuth();
  const [matches, setMatches] = useState([]);
  const [batchEntries, setBatchEntries] = useState([]); 
  const [formErrors, setFormErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const matchesPerPage = 20;

  // Calculate pagination values
  const indexOfLastMatch = currentPage * matchesPerPage;
  const indexOfFirstMatch = indexOfLastMatch - matchesPerPage;
  const currentMatches = matches.slice(indexOfFirstMatch, indexOfLastMatch);
  const totalPages = Math.ceil(matches.length / matchesPerPage);

  // Initialize batch entries after matches have loaded
  useEffect(() => {
    // Only initialize when matches have finished loading
    if (!matchesLoaded) return;
    
    const initializeEntries = async () => {
      try {
        // First check for saved entries in cookies
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
          // If no saved entries, create a new one using match history if available
          setBatchEntries([createBatchRow(null, matches)]);
        }
      } catch (error) {
        console.error('Error initializing batch entries:', error);
        setBatchEntries([createBatchRow()]);
      }
    };
    
    initializeEntries();
  }, [matchesLoaded, matches]);

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
          
          // Add points and auto fields if they don't exist in old match data
          const processedData = data.map(match => ({
            ...match,
            // Ensure points exists, default to 0 if missing
            points: match.points !== undefined ? match.points : 0,
            // Ensure auto exists, default to true if missing
            auto: match.auto !== undefined ? match.auto : true
          }));
          
          // Sort matches by timestamp, newest first
          const sortedData = processedData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          setMatches(sortedData);
          
          // After matches are loaded, check if we need to initialize batch entries
          setMatchesLoaded(true);
        } else {
          setMatches([]);
          setMatchesLoaded(true);
        }
      } catch (error) {
        console.error('Error loading match data:', error);
        setMatches([]);
        setMatchesLoaded(true);
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
    const newRow = createBatchRow(firstRow, matches);
    
    // Set the points based on the previous entry if auto is enabled
    if (newRow.auto) {
      const prevPoints = batchEntries.length > 0 ? batchEntries[0].points : 
                       matches.length > 0 ? matches[0].points : 0;
      
      if (newRow.result === 'victory') {
        newRow.points = prevPoints + 10;
      } else if (newRow.result === 'defeat') {
        newRow.points = prevPoints - 7;
      } else {
        newRow.points = prevPoints;
      }
    }
    
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
  };  // Toggle edit mode for a match entry
  const toggleEditMode = (id) => {
    if (editingId && editingId !== id) {
      saveEdit(editingId);
    }
    
    // Find the entry and print its values to console
    const entryToEdit = [...batchEntries, ...matches].find(entry => entry.id === id);
    if (entryToEdit) {
      console.log('Edit button clicked for entry:', entryToEdit);
      // Print points and auto values specifically
      console.log('Points:', entryToEdit.points);
      console.log('Auto Calculation Enabled:', entryToEdit.auto);
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
  };  // Handle change to a batch entry field
  const handleBatchEntryChange = (id, field, value) => {
    // Helper to calculate auto points based on previous entry and result
    const calculateAutoPoints = (entry, prevPoints) => {
      // Only calculate if auto is enabled
      if (!entry.auto) return entry.points;
      
      const basePoints = prevPoints !== undefined ? prevPoints : 0;
      if (entry.result === 'victory') return basePoints + 10;
      if (entry.result === 'defeat') return basePoints - 7;
      return basePoints; // Draw or none
    };
    
    // Function to update all dependent entries when a point value changes
    const updateDependentEntries = (entries, startIndex) => {
      // We need to update all entries BEFORE the changed entry (since we display newest first)
      // that have auto=true because they depend on this entry's points
      for (let i = startIndex - 1; i >= 0; i--) {
        if (entries[i].auto) {
          const dependentEntry = entries[i];
          const prevPoints = i < entries.length - 1 ? entries[i + 1].points : 0;
          entries[i] = {
            ...dependentEntry,
            points: calculateAutoPoints(dependentEntry, prevPoints)
          };
        }
      }
      return entries;
    };
    
    const entryIndex = batchEntries.findIndex(entry => entry.id === id);
    
    if (entryIndex === -1) {
      // Handling match history entries
      const matchIndex = matches.findIndex(match => match.id === id);
      if (matchIndex !== -1) {
        const updatedMatches = [...matches];
        const currentMatch = { ...updatedMatches[matchIndex] };
        const prevPoints = matchIndex < matches.length - 1 ? matches[matchIndex + 1].points : 0;
          // Update the specific field first
        if (field.includes('.')) {
          const [parent, child] = field.split('.');
          currentMatch[parent] = {
            ...currentMatch[parent],
            [child]: value
          };        } else {
          currentMatch[field] = value;
        }
        
        // Always calculate auto points if auto is enabled
        if (field === 'auto' ? value : currentMatch.auto) {
          currentMatch.points = calculateAutoPoints(
            field === 'auto' ? {...currentMatch, auto: value} : currentMatch, 
            prevPoints
          );
        }
        
        updatedMatches[matchIndex] = currentMatch;
        
        // Now update any dependent entries (entries that come before this one)
        const finalMatches = updateDependentEntries(updatedMatches, matchIndex);
        
        setMatches(finalMatches);
      }
      
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
    
    // Handling batch entries
    const updatedEntries = [...batchEntries];
    const currentEntry = { ...updatedEntries[entryIndex] };
    const prevPoints = entryIndex < batchEntries.length - 1 
      ? batchEntries[entryIndex + 1].points 
      : matches.length > 0 ? matches[0].points : 0;
    
    // Update the specific field first
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      currentEntry[parent] = {
        ...currentEntry[parent],
        [child]: value
      };    } else {
      currentEntry[field] = value;
    }    
    
    // Always calculate auto points if auto is enabled
    if (field === 'auto' ? value : currentEntry.auto) {
      currentEntry.points = calculateAutoPoints(
        field === 'auto' ? {...currentEntry, auto: value} : currentEntry, 
        prevPoints
      );
    }
    
    updatedEntries[entryIndex] = currentEntry;
    
    // Now update any dependent entries
    const finalEntries = updateDependentEntries(updatedEntries, entryIndex);
    
    setBatchEntries(finalEntries);
    
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
      
      // Check if primary and secondary are the same for your deck
      if (entry.yourDeck.primary && entry.yourDeck.secondary && 
          entry.yourDeck.primary === entry.yourDeck.secondary) {
        entryErrors['yourDeck.secondary'] = 'Cannot be the same as primary';
        isValid = false;
      }
      
      // Check if primary and variant are the same for your deck
      if (entry.yourDeck.primary && entry.yourDeck.variant && 
          entry.yourDeck.primary === entry.yourDeck.variant) {
        entryErrors['yourDeck.variant'] = 'Cannot be the same as primary';
        isValid = false;
      }
      
      // Check if secondary and variant are the same for your deck
      if (entry.yourDeck.secondary && entry.yourDeck.variant && 
          entry.yourDeck.secondary === entry.yourDeck.variant) {
        entryErrors['yourDeck.variant'] = 'Cannot be the same as secondary';
        isValid = false;
      }
      
      // Check if primary and secondary are the same for opponent's deck
      if (entry.opponentDeck.primary && entry.opponentDeck.secondary && 
          entry.opponentDeck.primary === entry.opponentDeck.secondary) {
        entryErrors['opponentDeck.secondary'] = 'Cannot be the same as primary';
        isValid = false;
      }
      
      // Check if primary and variant are the same for opponent's deck
      if (entry.opponentDeck.primary && entry.opponentDeck.variant && 
          entry.opponentDeck.primary === entry.opponentDeck.variant) {
        entryErrors['opponentDeck.variant'] = 'Cannot be the same as primary';
        isValid = false;
      }
      
      // Check if secondary and variant are the same for opponent's deck
      if (entry.opponentDeck.secondary && entry.opponentDeck.variant && 
          entry.opponentDeck.secondary === entry.opponentDeck.variant) {
        entryErrors['opponentDeck.variant'] = 'Cannot be the same as secondary';
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
                previousEntryPoints={batchEntries.indexOf(entry) < batchEntries.length - 1 ? 
                  batchEntries[batchEntries.indexOf(entry) + 1].points : 
                  matches.length > 0 ? matches[0].points : undefined}
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
                  previousEntryPoints={matches.findIndex(m => m.id === match.id) < matches.length - 1 ? 
                    matches[matches.findIndex(m => m.id === match.id) + 1].points : undefined}
                />
              ))}

              {totalPages > 1 && (
                <div className="flex justify-center mt-4 items-center gap-2">
                  {/* Left Arrow - Only show if not on first page */}
                  {currentPage > 1 && (
                    <button 
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-100"
                      aria-label="Previous page"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  
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
                  
                  {/* Right Arrow - Only show if not on last page */}
                  {currentPage < totalPages && (
                    <button 
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-100"
                      aria-label="Next page"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
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