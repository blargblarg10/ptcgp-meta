/**
 * Structure validator module
 * @module validators/structureValidator
 * @description Validates CSV and JSON data structure without business rule validation
 */

import { 
  EXPECTED_HEADERS, 
  REQUIRED_HEADERS, 
  OPTIONAL_HEADERS 
} from '../constants/fieldConstants';
import { MATCH_RECORD_FIELDS } from '../constants/fieldConstants';
import { filterCsvContent } from '../utils/formatUtils';

/**
 * Analyzes a raw CSV file for basic structure and format issues
 * @param {string} csvContent - Raw CSV file content 
 * @returns {Object} Validation results with stats and errors/warnings
 */
export function validateCsvStructure(csvContent) {
  if (!csvContent || typeof csvContent !== 'string') {
    return {
      valid: false,
      errors: ['Invalid CSV content'],
      stats: {}
    };
  }

  // Filter out blank lines and comment lines that start with #
  const filteredRows = filterCsvContent(csvContent);
  const filteredContent = filteredRows.join('\n');

  // Basic structure validation
  const rows = filteredContent.split(/\r?\n/);
  if (rows.length < 2) {
    return {
      valid: false,
      errors: ['CSV file must contain at least a header row and one data row'],
      stats: { rowCount: rows.length }
    };
  }
  
  // Header validation
  const headers = rows[0].split(',').map(h => h.trim());
  
  const missingRequiredHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
  const missingOptionalHeaders = OPTIONAL_HEADERS.filter(h => !headers.includes(h));
  const unexpectedHeaders = headers.filter(h => !EXPECTED_HEADERS.includes(h));

  const errors = [];
  const warnings = [];
  
  // Only treat missing required headers as errors
  if (missingRequiredHeaders.length > 0) {
    errors.push(`Missing required headers: ${missingRequiredHeaders.join(', ')}`);
  }
  
  // Treat missing optional headers as warnings
  if (missingOptionalHeaders.length > 0) {
    warnings.push(`Missing optional headers that will be auto-created: ${missingOptionalHeaders.join(', ')}`);
  }
  
  if (unexpectedHeaders.length > 0) {
    warnings.push(`Unexpected headers: ${unexpectedHeaders.join(', ')}`);
  }

  // Calculate basic stats
  const stats = {
    rowCount: rows.length - 1, // Excluding header row
    headerCount: headers.length,
    missingRequiredHeadersCount: missingRequiredHeaders.length,
    missingOptionalHeadersCount: missingOptionalHeaders.length,
    unexpectedHeadersCount: unexpectedHeaders.length
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats
  };
}

/**
 * Validates JSON data structure to ensure it only contains expected fields
 * @param {Array} jsonData - Array of match data objects
 * @returns {Object} Object with validation result and any errors
 */
export function validateJsonStructure(jsonData) {
  if (!Array.isArray(jsonData)) {
    return { valid: false, errors: ['Data must be an array'] };
  }
  
  if (jsonData.length === 0) {
    return { valid: true, errors: [], warnings: ['No records to validate'] }; // Empty array is valid
  }
  
  const errors = [];
  const warnings = [];
  
  // Check each object in the array
  jsonData.forEach((item, index) => {
    // Check for required structure
    if (!item.yourDeck || typeof item.yourDeck !== 'object') {
      errors.push(`Row ${index + 1}: Missing or invalid 'yourDeck' object`);
    }
    
    if (!item.opponentDeck || typeof item.opponentDeck !== 'object') {
      errors.push(`Row ${index + 1}: Missing or invalid 'opponentDeck' object`);
    }
    
    // Check for extra fields that aren't in the expected schema
    Object.keys(item).forEach(key => {
      if (!MATCH_RECORD_FIELDS.includes(key)) {
        errors.push(`Row ${index + 1}: Unexpected field '${key}'`);
      }
    });
    
    // Check deck objects for extra fields
    ['yourDeck', 'opponentDeck'].forEach(deckKey => {
      if (item[deckKey]) {
        Object.keys(item[deckKey]).forEach(key => {
          if (!['primary', 'secondary', 'variant'].includes(key)) {
            errors.push(`Row ${index + 1}: Unexpected field '${deckKey}.${key}'`);
          }
        });
      }
    });
  });
  
  return { valid: errors.length === 0, errors, warnings };
}
