/**
 * Data preprocessor module
 * @module processors/dataPreprocessor
 * @description Processes and transforms data before validation or storage
 */

import { DEFAULT_VALUES } from '../constants/defaultValues';
import { DATE_REGEX } from '../constants/validationConstants';
import { createDetailedError } from '../utils/validationUtils';

/**
 * Normalizes date formats like MM/DD/YYYY to ISO timestamps
 * If multiple entries have the same date, each is offset by 1 minute
 * @param {Array} jsonData - Array of match records
 * @returns {Array} Processed records with standardized timestamps
 */
export function normalizeTimestamps(jsonData) {
  if (!Array.isArray(jsonData) || jsonData.length === 0) {
    return jsonData;
  }

  // Track dates we've seen to handle duplicates
  const dateMap = {};
  
  return jsonData.map(record => {
    if (!record.timestamp) return record;
    
    // Check if timestamp is in MM/DD/YYYY format
    const match = record.timestamp.match(DATE_REGEX);
    if (!match) return record; // Not in date-only format, leave as is
    
    // Extract date components
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    const year = match[3];
    
    // Create base timestamp for this date
    const dateKey = `${year}-${month}-${day}`;
    
    if (!dateMap[dateKey]) {
      // First occurrence of this date - set to 12:00 PM (noon)
      dateMap[dateKey] = 0;
    } else {
      // Increment counter for this date
      dateMap[dateKey]++;
    }
    
    // Add one minute for each additional occurrence after the first
    const minutesToAdd = dateMap[dateKey];
    
    // Create a new Date object for 12:00 PM (noon) on the specified date
    const date = new Date(`${year}-${month}-${day}T12:00:00.000Z`);
    
    // Add minutes for duplicate dates
    date.setMinutes(date.getMinutes() + minutesToAdd);
    
    // Return the record with updated timestamp
    return {
      ...record,
      timestamp: date.toISOString()
    };
  });
}

/**
 * Adds missing fields with default values to match records
 * @param {Array} jsonData - Array of match records
 * @returns {Object} Object with processed records and warnings
 */
export function addDefaultValues(jsonData) {
  if (!Array.isArray(jsonData) || jsonData.length === 0) {
    return { data: jsonData, warnings: [] };
  }
  
  const warnings = [];
  const processedData = jsonData.map((record, index) => {
    const processedRecord = { ...record };
    
    // Add optional fields with default values if missing
    Object.entries(DEFAULT_VALUES).forEach(([field, defaultValue]) => {
      if (processedRecord[field] === undefined) {
        processedRecord[field] = field === 'id' 
          ? `match-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
          : defaultValue;
        warnings.push(`Row ${index + 1}: Missing ${field} field - automatically ${field === 'id' ? 'assigned' : 'set'}: ${processedRecord[field]}`);
      }
    });
    
    // Make sure yourDeck and opponentDeck objects exist with all required properties
    ['yourDeck', 'opponentDeck'].forEach(deckField => {
      if (!processedRecord[deckField]) {
        processedRecord[deckField] = { primary: null, secondary: null, variant: null };
        warnings.push(`Row ${index + 1}: Missing '${deckField}' information - created empty object`);
      } else {
        // Ensure all deck fields exist
        ['primary', 'secondary', 'variant'].forEach(cardField => {
          if (processedRecord[deckField][cardField] === undefined) {
            processedRecord[deckField][cardField] = null;
            warnings.push(`Row ${index + 1}: Missing '${deckField}.${cardField}' field - set to null`);
          }
        });
      }
    });
    
    return processedRecord;
  });
  
  return { data: processedData, warnings };
}

/**
 * Prepares match data for import by normalizing values and adding defaults
 * @param {Array} jsonData - Array of match records to preprocess
 * @returns {Object} Object with processed data and warnings
 */
export function preprocessMatchData(jsonData) {
  // Normalize timestamps first
  const normalizedData = normalizeTimestamps(jsonData);
  
  // Track which records had their timestamps converted
  const convertedTimestamps = [];
  normalizedData.forEach((record, index) => {
    if (jsonData[index] && jsonData[index].timestamp !== record.timestamp) {
      convertedTimestamps.push(`Row ${index + 1}: Converted date '${jsonData[index].timestamp}' to timestamp '${record.timestamp}'`);
    }
  });
  
  // Add default values for missing fields
  const { data: processedData, warnings } = addDefaultValues(normalizedData);
  
  return {
    data: processedData,
    warnings: [...convertedTimestamps, ...warnings]
  };
}
