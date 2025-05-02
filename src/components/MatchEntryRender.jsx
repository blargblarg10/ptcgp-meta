import React from 'react';
import { AVAILABLE_CARDS, CARDS_BY_ELEMENT, getCardInfo } from '../utils/cardDataProcessor';

const MatchEntry = ({ 
  entry, 
  isEditing, 
  onEdit, 
  onRemove, 
  onFieldChange, 
  formErrors 
}) => {
  const isLocked = entry.isLocked && !isEditing;
  const basePath = import.meta.env.BASE_URL || '/';

  // Render a card select dropdown
  const renderCardSelect = (field, value, disabled, excludeCard = null) => {
    const availableCards = excludeCard 
      ? AVAILABLE_CARDS.filter(card => card.key !== excludeCard)
      : AVAILABLE_CARDS;
      
    return (
      <select
        value={value || ""}
        onChange={(e) => {
          onFieldChange(entry.id, field, e.target.value);
        }}
        disabled={disabled}
        className={`block w-full h-10 rounded border ${
          disabled ? 'bg-gray-200 text-gray-500' : 'bg-white'
        } ${
          formErrors?.[entry.id]?.[field] ? 'border-red-500' : 'border-gray-300'
        }`}
      >
        <option value="">Select Card</option>
        {Object.entries(CARDS_BY_ELEMENT).map(([element, cards]) => (
          <optgroup key={element} label={element || "Other"}>
            {cards.map(card => (
              <option 
                key={card.key} 
                value={card.key}
              >
                {card.displayName}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
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
      <div className="grid grid-cols-24 gap-4">
        {/* Your Deck */}
        <div className="col-span-8">
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
        
        {/* Turn Order */}
        <div className="col-span-3">
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
            }`}
          >
            <span className="font-medium">
              {entry.turnOrder === 'first' ? 'FIRST' : entry.turnOrder === 'second' ? 'SECOND' : 'TURN'}
            </span>
          </button>
        </div>
        
        {/* Opponent's Deck */}
        <div className="col-span-8">
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
        
        {/* Result */}
        <div className="col-span-3">
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
            } ${isLocked ? 'opacity-75 cursor-not-allowed' : 'hover:bg-opacity-90'}`}
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
        <div className="col-span-2 flex items-end justify-end space-x-2">
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
          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            className="h-10 w-10 flex items-center justify-center text-xl rounded-md bg-red-500 text-white shadow-sm hover:bg-opacity-90 transition-colors duration-200"
            title="Remove"
          >
            ×
          </button>
        </div>
      </div>
      
      {entry.isLocked && (
        <div className="mt-2 text-xs text-gray-500">
          Recorded: {new Date(entry.timestamp).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

export default MatchEntry;