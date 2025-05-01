import React, { useState, useEffect } from 'react';
import MatchEntry from './MatchEntryRender';
import { loadMatchData, saveMatchData } from '../utils/matchStatsCalculator';

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
  turnOrder: "first",
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

const MatchResultTracker = ({ fileHandle }) => {
  // State
  const [matches, setMatches] = useState([]);
  const [batchEntries, setBatchEntries] = useState([createBatchRow()]);
  const [formErrors, setFormErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const matchesPerPage = 20;

  // Calculate pagination values
  const indexOfLastMatch = currentPage * matchesPerPage;
  const indexOfFirstMatch = indexOfLastMatch - matchesPerPage;
  const currentMatches = matches.slice(indexOfFirstMatch, indexOfLastMatch);
  const totalPages = Math.ceil(matches.length / matchesPerPage);

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Load match data on component mount or when fileHandle changes
  useEffect(() => {
    const loadMatches = async () => {
      try {
        const data = await loadMatchData(fileHandle);
        if (data) {
          // Sort matches by timestamp, newest first
          setMatches(data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        } else {
          setMatches([]);
        }
      } catch (error) {
        console.error('Error loading match data:', error);
        setMatches([]);
      }
    };
    
    if (fileHandle) {
      loadMatches();
    }
  }, [fileHandle]);

  // Save match data to file
  const saveMatchDataToFile = async (updatedMatches) => {
    if (!fileHandle) return;
    
    try {
      await saveMatchData(fileHandle, updatedMatches);
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
      await saveMatchDataToFile(updatedMatches);
      if (editingId === id) {
        setEditingId(null);
      }
      return;
    }
    
    if (batchEntries.length === 1 && !matches.some(m => m.isLocked)) {
      return;
    }
    
    setBatchEntries(batchEntries.filter(entry => entry.id !== id));
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
    await saveMatchDataToFile(updatedMatches);
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
        entryErrors['result'] = 'Select a result';
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

    const newMatches = batchEntries.map(entry => ({
      ...entry,
      id: entry.id.startsWith('new-') ? `match-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` : entry.id,
      isLocked: true
    }));

    // Add new matches to the beginning of the array to maintain newest-first order
    const updatedMatches = [...newMatches, ...matches];
    setMatches(updatedMatches);
    await saveMatchDataToFile(updatedMatches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    
    setBatchEntries([createBatchRow()]);
    setFormErrors({});
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Match Result Tracker</h1>
      
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
    </div>
  );
};

export default MatchResultTracker;