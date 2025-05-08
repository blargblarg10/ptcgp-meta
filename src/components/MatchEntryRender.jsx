import React, { useState, useRef, useEffect } from 'react';
import { AVAILABLE_CARDS, CARDS_BY_ELEMENT, getCardInfo } from '../utils/cardDataProcessor';

// Updated SearchableDropdown component
const SearchableDropdown = ({ 
  value, 
  onChange, 
  options, 
  optgroups = null, 
  disabled, 
  className, 
  placeholder = "Select Card",
  matchHistory = [] 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  
  // Selected option
  const selectedOption = value ? 
    (optgroups 
      ? Object.values(optgroups).flat().find(option => option.key === value)
      : options.find(option => option.key === value)) 
    : null;
    
  // Process match history to get frequent cards
  const getRecentCards = () => {
    if (!matchHistory || matchHistory.length === 0) return [];
    
    // Get the 20 most recent matches
    const recentMatches = [...matchHistory].slice(0, 20);
    
    // Count card frequencies
    const cardCounts = {};
    recentMatches.forEach(match => {
      // Count your deck cards
      if (match.yourDeck.primary) {
        cardCounts[match.yourDeck.primary] = (cardCounts[match.yourDeck.primary] || 0) + 1;
      }
      if (match.yourDeck.secondary) {
        cardCounts[match.yourDeck.secondary] = (cardCounts[match.yourDeck.secondary] || 0) + 1;
      }
      
      // Count opponent deck cards
      if (match.opponentDeck.primary) {
        cardCounts[match.opponentDeck.primary] = (cardCounts[match.opponentDeck.primary] || 0) + 1;
      }
      if (match.opponentDeck.secondary) {
        cardCounts[match.opponentDeck.secondary] = (cardCounts[match.opponentDeck.secondary] || 0) + 1;
      }
    });
    
    // Sort by frequency and get top 10
    return Object.entries(cardCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([cardKey]) => {
        const cardInfo = getCardInfo(cardKey);
        return cardInfo;
      });
  };
  
  // Get recent cards from match history
  const recentCards = getRecentCards();
  
  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        // Reset search term if we have a selected value
        if (value) {
          setSearchTerm('');
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [value]);
  
  // Filter options based on search term
  const filteredOptions = optgroups 
    ? Object.entries(optgroups).reduce((acc, [group, groupOptions]) => {
        const filtered = groupOptions.filter(option => 
          option.displayName.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (filtered.length > 0) {
          acc[group] = filtered;
        }
        return acc;
      }, {})
    : options.filter(option => 
        option.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
  // Count total filtered options
  const totalFilteredOptions = optgroups
    ? Object.values(filteredOptions).reduce((sum, group) => sum + group.length, 0)
    : filteredOptions.length;

  // Update display value when selected option changes
  useEffect(() => {
    if (!isOpen && selectedOption) {
      setSearchTerm('');
    }
  }, [isOpen, selectedOption]);

  // Handle input change
  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        className={`w-full px-3 py-2 border rounded ${className}`}
        placeholder={placeholder}
        value={isOpen ? searchTerm : selectedOption ? selectedOption.displayName : searchTerm}
        onChange={handleInputChange}
        onFocus={() => !disabled && setIsOpen(true)}
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
      />
      
      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-115 overflow-auto">
          {totalFilteredOptions === 0 && recentCards.length === 0 ? (
            <div className="p-2 text-gray-500">No matches found</div>
          ) : (
            <>
              {/* Recent Cards Section */}
              {recentCards.length > 0 && searchTerm === '' && (
                <div>
                  <div className="sticky top-0 p-1 bg-blue-100 font-semibold text-sm">Recent</div>
                  {recentCards.map(option => (
                    <div
                      key={option.key}
                      className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                      onClick={() => {
                        onChange(option.key);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                    >
                      {option.iconPath && (
                        <img 
                          src={`${import.meta.env.BASE_URL || '/'}icons/${option.iconPath.split('/').pop()}`}
                          alt={option.displayName} 
                          className="w-5 h-5 mr-2"
                        />
                      )}
                      {option.displayName}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Regular Categories */}
              {optgroups && totalFilteredOptions > 0 && Object.entries(filteredOptions).map(([group, groupOptions]) => (
                <div key={group}>
                  <div className="sticky top-0 p-1 bg-gray-100 font-semibold text-sm">{group || "Other"}</div>
                  {groupOptions.map(option => (
                    <div
                      key={option.key}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        onChange(option.key);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                    >
                      {option.displayName}
                    </div>
                  ))}
                </div>
              ))}
              
              {/* Regular Options (no groups) */}
              {!optgroups && filteredOptions.length > 0 && filteredOptions.map(option => (
                <div
                  key={option.key}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    onChange(option.key);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  {option.displayName}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const MatchEntry = ({ 
  entry, 
  isEditing, 
  onEdit, 
  onRemove, 
  onFieldChange, 
  formErrors,
  matchHistory = [] 
}) => {
  const isLocked = entry.isLocked && !isEditing;
  const basePath = import.meta.env.BASE_URL || '/';
  // Add state for delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Render a card select dropdown
  const renderCardSelect = (field, value, disabled, excludeCard = null) => {
    const availableCards = excludeCard 
      ? AVAILABLE_CARDS.filter(card => card.key !== excludeCard)
      : AVAILABLE_CARDS;
      
    // Filter out excluded card from card groups too
    const cardsByElement = excludeCard 
      ? Object.entries(CARDS_BY_ELEMENT).reduce((acc, [element, cards]) => {
          acc[element] = cards.filter(card => card.key !== excludeCard);
          return acc;
        }, {})
      : CARDS_BY_ELEMENT;
      
    return (
      <SearchableDropdown
        value={value || ""}
        onChange={(value) => {
          onFieldChange(entry.id, field, value);
        }}
        disabled={disabled}
        optgroups={cardsByElement}
        matchHistory={matchHistory}
        className={`block w-full h-10 ${
          disabled ? 'bg-gray-200 text-gray-500' : 'bg-white'
        } ${
          formErrors?.[entry.id]?.[field] ? 'border-red-500' : 'border-gray-300'
        }`}
      />
    );
  };
  
  let rowClasses = "p-3 rounded-lg border-2 mb-4 relative transition-all duration-200 ";
  
  if (isLocked) {
    if (entry.result === 'victory') {
      rowClasses += "border-blue-300 bg-blue-50/75 opacity-75 ";
    } else if (entry.result === 'defeat') {
      rowClasses += "border-red-300 bg-red-50/75 opacity-75 ";
    } else if (entry.result === 'draw') {
      rowClasses += "border-gray-300 bg-gray-50/75 opacity-75 ";
    } else {
      rowClasses += "border-gray-300 bg-gray-50 opacity-75 ";
    }
  } else if (isEditing) {
    rowClasses += "border-yellow-400 shadow-md ";
  } else if (entry.result === 'victory') {
    rowClasses += "border-blue-300 bg-blue-50 ";
  } else if (entry.result === 'defeat') {
    rowClasses += "border-red-300 bg-red-50 ";
  } else if (entry.result === 'draw') {
    rowClasses += "border-gray-300 bg-gray-100 ";
  } else {
    rowClasses += "border-gray-200 bg-white ";
  }

  return (
    <div className={rowClasses}>
      {/* Timestamp in top right corner when locked */}
      {entry.isLocked && (
        <div className="absolute top-2 right-3 text-xs text-gray-500">
          Recorded: {new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString()}
        </div>
      )}
      
      {/* Responsive grid layout - Stack on mobile, grid on larger screens */}
      <div className="md:grid md:grid-cols-24 md:gap-4 space-y-3 md:space-y-0">
        {/* Your Deck */}
        <div className="md:col-span-8 md:mb-0">
          <div className="flex items-center mb-1 h-6">
            <label className="text-xs font-medium text-gray-700">Your Deck</label>
            <div className="flex ml-2">
              {entry.yourDeck.primary && getCardInfo(entry.yourDeck.primary)?.iconPath && (
                <img 
                  src={`${basePath}icons/${getCardInfo(entry.yourDeck.primary).iconPath.split('/').pop()}`}
                  alt="Primary Pokemon" 
                  className="w-6 h-6"
                />
              )}
              {entry.yourDeck.secondary && getCardInfo(entry.yourDeck.secondary)?.iconPath && (
                <img 
                  src={`${basePath}icons/${getCardInfo(entry.yourDeck.secondary).iconPath.split('/').pop()}`}
                  alt="Secondary Pokemon" 
                  className="w-6 h-6 ml-1"
                />
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <div className="flex-1">
              {renderCardSelect('yourDeck.primary', entry.yourDeck.primary, isLocked)}
              {formErrors?.[entry.id]?.['yourDeck.primary'] && (
                <div className="text-red-500 text-xs mt-1">{formErrors[entry.id]['yourDeck.primary']}</div>
              )}
            </div>
            <div className="flex-1">
              {renderCardSelect('yourDeck.secondary', entry.yourDeck.secondary, isLocked, entry.yourDeck.primary)}
            </div>
          </div>
        </div>
        
        {/* Turn Order and Result: side by side on mobile, separate columns on desktop */}
        <div className="flex space-x-2 md:space-x-0 md:block md:col-span-3">
          <div className="flex-1 md:w-full">
            <div className="h-6 flex items-center mb-1">
              <label className="block text-xs font-medium text-gray-700 truncate whitespace-nowrap" title="Turn Order">Turn Order</label>
            </div>
            <button
              type="button"
              onClick={() => !isLocked && onFieldChange(entry.id, 'turnOrder', entry.turnOrder === 'first' ? 'second' : 'first')}
              disabled={isLocked}
              className={`h-10 w-full rounded-md flex items-center justify-center text-sm font-medium shadow-sm transition-colors duration-200 ${
                isLocked ? 'opacity-75 cursor-not-allowed' : 'hover:bg-opacity-90'
              } ${
                entry.turnOrder === 'first' 
                  ? 'bg-blue-500 text-white' 
                  : entry.turnOrder === 'second'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700'
              } ${
                formErrors?.[entry.id]?.turnOrder ? 'border-2 border-red-500' : ''
              }`}
            >
              <span className="font-medium">
                {entry.turnOrder === 'first' ? 'FIRST' : entry.turnOrder === 'second' ? 'SECOND' : 'None'}
              </span>
            </button>
          </div>

          {/* Result on mobile (visible in smaller screens, hidden in md) */}
          <div className="flex-1 md:hidden">
            <div className="h-6 flex items-center mb-1">
              <label className="block text-xs font-medium text-gray-700 truncate whitespace-nowrap" title="Result">Result</label>
            </div>
            <button
              type="button"
              className={`h-10 w-full rounded-md flex items-center justify-center text-sm font-medium shadow-sm transition-colors duration-200 ${
                entry.result === 'victory'
                  ? 'bg-blue-500 text-white'
                  : entry.result === 'defeat'
                  ? 'bg-red-500 text-white'
                  : entry.result === 'draw'
                  ? 'bg-gray-500 text-white'
                  : 'bg-gray-100 text-gray-700'
              } ${isLocked ? 'opacity-75 cursor-not-allowed' : 'hover:bg-opacity-90'} ${
                formErrors?.[entry.id]?.result ? 'border-2 border-red-500' : ''
              }`}
              onClick={() => {
                if (!isLocked) {
                  const nextResult = entry.result === 'none' 
                    ? 'victory' 
                    : entry.result === 'victory' 
                    ? 'defeat' 
                    : entry.result === 'defeat'
                    ? 'draw'
                    : 'victory';
                  onFieldChange(entry.id, 'result', nextResult);
                }
              }}
              disabled={isLocked}
            >
              {entry.result === 'none' 
                ? 'None' 
                : entry.result === 'victory' 
                ? 'Victory' 
                : entry.result === 'defeat'
                ? 'Defeat'
                : 'Draw'}
            </button>
          </div>
        </div>
        
        {/* Opponent's Deck */}
        <div className="md:col-span-8">
          <div className="flex items-center mb-1 h-6">
            <label className="text-xs font-medium text-gray-700">Opponent's Deck</label>
            <div className="flex ml-2">
              {entry.opponentDeck.primary && getCardInfo(entry.opponentDeck.primary)?.iconPath && (
                <img 
                  src={`${basePath}icons/${getCardInfo(entry.opponentDeck.primary).iconPath.split('/').pop()}`}
                  alt="Primary Pokemon" 
                  className="w-6 h-6"
                />
              )}
              {entry.opponentDeck.secondary && getCardInfo(entry.opponentDeck.secondary)?.iconPath && (
                <img 
                  src={`${basePath}icons/${getCardInfo(entry.opponentDeck.secondary).iconPath.split('/').pop()}`}
                  alt="Secondary Pokemon" 
                  className="w-6 h-6 ml-1"
                />
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <div className="flex-1">
              {renderCardSelect('opponentDeck.primary', entry.opponentDeck.primary, isLocked)}
              {formErrors?.[entry.id]?.['opponentDeck.primary'] && (
                <div className="text-red-500 text-xs mt-1">{formErrors[entry.id]['opponentDeck.primary']}</div>
              )}
            </div>
            <div className="flex-1">
              {renderCardSelect('opponentDeck.secondary', entry.opponentDeck.secondary, isLocked, entry.opponentDeck.primary)}
            </div>
          </div>
        </div>
        
        {/* Result - Only visible on md+ screens */}
        <div className="hidden md:block md:col-span-3">
          <div className="h-6 flex items-center mb-1">
            <label className="block text-xs font-medium text-gray-700 truncate whitespace-nowrap" title="Result">Result</label>
          </div>
          <button
            type="button"
            className={`h-10 w-full rounded-md flex items-center justify-center text-sm font-medium shadow-sm transition-colors duration-200 ${
              entry.result === 'victory'
                ? 'bg-blue-500 text-white'
                : entry.result === 'defeat'
                ? 'bg-red-500 text-white'
                : entry.result === 'draw'
                ? 'bg-gray-500 text-white'
                : 'bg-gray-100 text-gray-700'
            } ${isLocked ? 'opacity-75 cursor-not-allowed' : 'hover:bg-opacity-90'} ${
              formErrors?.[entry.id]?.result ? 'border-2 border-red-500' : ''
            }`}
            onClick={() => {
              if (!isLocked) {
                const nextResult = entry.result === 'none' 
                  ? 'victory' 
                  : entry.result === 'victory' 
                  ? 'defeat' 
                  : entry.result === 'defeat'
                  ? 'draw'
                  : 'victory';
                onFieldChange(entry.id, 'result', nextResult);
              }
            }}
            disabled={isLocked}
          >
            {entry.result === 'none' 
              ? 'None' 
              : entry.result === 'victory' 
              ? 'Victory' 
              : entry.result === 'defeat'
              ? 'Defeat'
              : 'Draw'}
          </button>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end md:col-span-2 md:items-end">
          <div className="flex space-x-2">
            {/* Delete button first (only appears in edit mode or for new entries) */}
            {(isEditing || !entry.isLocked) && (
              <button
                type="button"
                onClick={() => {
                  // Only show confirmation for editing existing entries, not for new/unsubmitted ones
                  if (isEditing && entry.isLocked) {
                    setShowDeleteConfirm(true);
                  } else {
                    // Direct delete for unsubmitted entries
                    onRemove(entry.id);
                  }
                }}
                className="h-10 w-10 flex items-center justify-center text-xl rounded-md bg-red-500 text-white shadow-sm hover:bg-opacity-90 transition-colors duration-200"
                title="Remove"
              >
                ×
              </button>
            )}
            {/* Edit/Confirm button second */}
            {entry.isLocked && (
              <button
                type="button"
                onClick={() => onEdit(entry.id)}
                className={`h-10 w-10 flex items-center justify-center text-lg rounded-md text-white shadow-sm hover:bg-opacity-90 transition-colors duration-200 ${
                  isEditing ? 'bg-green-500' : 'bg-amber-500'
                }`}
              >
                {isEditing ? '✓' : '✎'}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Notes section */}
      <div className="mt-3">
        {/* Show notes input for editing or new (unlocked) entries */}
        {(!entry.isLocked || isEditing) && (
          <div className="mt-2">
            <input
              type="text"
              placeholder="Add notes about this match..."
              value={entry.notes || ""}
              onChange={(e) => onFieldChange(entry.id, 'notes', e.target.value)}
              className="w-full p-1 text-xs border border-gray-300 rounded"
            />
          </div>
        )}
        
        {/* Show notes when locked and notes exist - slightly bigger and darker */}
        {isLocked && entry.notes && (
          <div className="mt-1 text-sm text-gray-700">
            {entry.notes}
          </div>
        )}
      </div>
      
      {/* Delete confirmation popup - only appears for locked entries in edit mode */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-medium mb-2">Confirm Deletion</h3>
            <p className="mb-4">Are you sure you want to delete this match entry? This action cannot be undone.</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onRemove(entry.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchEntry;