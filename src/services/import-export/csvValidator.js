/**
 * Utility functions for validating CSV data format
 */

import { 
  EXPECTED_HEADERS, 
  REQUIRED_HEADERS, 
  OPTIONAL_HEADERS, 
  DATE_REGEX,
  VALID_TURN_ORDER_VALUES,
  VALID_RESULT_VALUES,
  ID_PATTERNS,
  DEFAULT_VALUES
} from './constants';
import { AVAILABLE_CARDS } from '../../shared/utils/cardDataProcessor';
import { filterCsvContent, findDuplicates, createDetailedError } from './utils';

/**
 * Converts date formats like MM/DD/YYYY to ISO timestamps
 * If multiple entries have the same date, each is offset by 1 minute
 * @param {Array} jsonData - Array of match records
 * @returns {Array} Processed records with standardized timestamps
 */
export const normalizeTimestamps = (jsonData) => {
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
};

/**
 * Validates a single match record
 * @param {Object} record - Match record object
 * @param {number} rowNum - Row number for error reporting
 * @returns {Array} Array of validation error messages
 */
const validateMatchRecord = (record, rowNum) => {
  const errors = [];

  // Check ID format only if it exists (we don't require ID as it will be auto-generated)
  if (record.id && !ID_PATTERNS.some(pattern => pattern.test(record.id))) {
    errors.push(createDetailedError(rowNum, 'id', record.id, 'Invalid ID format'));
  }

  // Check timestamp format
  if (!record.timestamp) {
    errors.push(createDetailedError(rowNum, 'timestamp', record.timestamp, 'Missing required field'));
  } else if (isNaN(Date.parse(record.timestamp))) {
    errors.push(createDetailedError(rowNum, 'timestamp', record.timestamp, 'Invalid timestamp format'));
  }

  // Validate deck information
  if (!record.yourDeck) {
    errors.push(createDetailedError(rowNum, 'yourDeck', record.yourDeck, 'Missing yourDeck information'));
  } else {
    // Check yourDeck.primary exists
    if (!record.yourDeck.primary) {
      errors.push(createDetailedError(rowNum, 'yourDeck.primary', record.yourDeck.primary, 'Missing primary deck value'));
    } else {
      // Validate yourDeck.primary is a valid card key in card_data
      const availableCardKeys = AVAILABLE_CARDS.map(card => card.key);
      if (!availableCardKeys.includes(record.yourDeck.primary)) {
        errors.push(createDetailedError(rowNum, 'yourDeck.primary', record.yourDeck.primary, 'Card does not exist in card database'));
      }
    }
    // Check yourDeck.secondary if it exists and is not null
    if (record.yourDeck.secondary !== "null" && record.yourDeck.secondary) {
      // Validate yourDeck.secondary is a valid card key in card_data
      const availableCardKeys = AVAILABLE_CARDS.map(card => card.key);
      if (!availableCardKeys.includes(record.yourDeck.secondary)) {
        errors.push(createDetailedError(rowNum, 'yourDeck.secondary', record.yourDeck.secondary, 'Card does not exist in card database'));
      }
    }
    // Check yourDeck.variant if it exists and is not null
    if (record.yourDeck.variant !== "null" && record.yourDeck.variant) {
      // Validate yourDeck.variant is a valid card key in card_data
      const availableCardKeys = AVAILABLE_CARDS.map(card => card.key);
      if (!availableCardKeys.includes(record.yourDeck.variant)) {
        errors.push(createDetailedError(rowNum, 'yourDeck.variant', record.yourDeck.variant, 'Card does not exist in card database'));
      }
    }
  }
  
  if (!record.opponentDeck) {
    errors.push(createDetailedError(rowNum, 'opponentDeck', record.opponentDeck, 'Missing opponentDeck information'));
  } else {
    // Check opponentDeck.primary exists
    if (!record.opponentDeck.primary) {
      errors.push(createDetailedError(rowNum, 'opponentDeck.primary', record.opponentDeck.primary, 'Missing primary deck value'));
    } else {
      // Validate opponentDeck.primary is a valid card key in card_data
      const availableCardKeys = AVAILABLE_CARDS.map(card => card.key);
      if (!availableCardKeys.includes(record.opponentDeck.primary)) {
        errors.push(createDetailedError(rowNum, 'opponentDeck.primary', record.opponentDeck.primary, 'Card does not exist in card database'));
      }
    }
    // Check opponentDeck.secondary if it exists and is not null
    if (record.opponentDeck.secondary !== "null" && record.opponentDeck.secondary) {
      // Validate opponentDeck.secondary is a valid card key in card_data
      const availableCardKeys = AVAILABLE_CARDS.map(card => card.key);
      if (!availableCardKeys.includes(record.opponentDeck.secondary)) {
        errors.push(createDetailedError(rowNum, 'opponentDeck.secondary', record.opponentDeck.secondary, 'Card does not exist in card database'));
      }
    }
    // Check opponentDeck.variant if it exists and is not null
    if (record.opponentDeck.variant !== "null" && record.opponentDeck.variant) {
      // Validate opponentDeck.variant is a valid card key in card_data
      const availableCardKeys = AVAILABLE_CARDS.map(card => card.key);
      if (!availableCardKeys.includes(record.opponentDeck.variant)) {
        errors.push(createDetailedError(rowNum, 'opponentDeck.variant', record.opponentDeck.variant, 'Card does not exist in card database'));
      }
    }
  }

  // Validate turn order
  if (!record.turnOrder) {
    errors.push(createDetailedError(rowNum, 'turnOrder', record.turnOrder, 'Missing required field'));
  } else if (!VALID_TURN_ORDER_VALUES.includes(String(record.turnOrder).toLowerCase())) {
    errors.push(createDetailedError(rowNum, 'turnOrder', record.turnOrder, 'Invalid value (must be "first", "second", 1, or 2)'));
  }

  // Validate match result
  if (!record.result) {
    errors.push(createDetailedError(rowNum, 'result', record.result, 'Missing required field'));
  } else if (!VALID_RESULT_VALUES.includes(String(record.result).toLowerCase())) {
    errors.push(createDetailedError(rowNum, 'result', record.result, 'Invalid value (must be "victory", "defeat", "win", "loss", or "tie")'));
  }

  return errors;
};

// Create a core validation function that both validateCsvData and preprocessAndValidateCsvData can use
/**
 * Core validation logic for match records that can be shared by different validation functions
 * @param {Array} records - Array of match records to validate
 * @returns {Object} Common validation results with errors and warnings
 * @private
 */
const _performCommonValidations = (records) => {
  const errors = [];
  const warnings = [];

  // Check for duplicate IDs
  const ids = records.map(record => record.id);
  const duplicateIds = findDuplicates(ids);
  if (duplicateIds.length > 0) {
    errors.push(`Found duplicate match IDs: ${duplicateIds.join(', ')}`);
  }

  // Check for future timestamps
  const now = new Date();
  records.forEach((record, index) => {
    if (record.timestamp) {
      const recordDate = new Date(record.timestamp);
      if (recordDate > now) {
        warnings.push(`Row ${index + 1}: Match timestamp is in the future: ${record.timestamp}`);
      }
    }
  });

  return { errors, warnings };
};

/**
 * Preprocesses and validates CSV data, applying automatic corrections for missing fields
 * @param {Object} jsonData - Parsed JSON data from CSV
 * @returns {Object} Processed data with validation results
 */
export const preprocessAndValidateCsvData = (jsonData) => {
  if (!Array.isArray(jsonData)) {
    return {
      data: [],
      valid: false,
      errors: ['Invalid data format: Expected an array of match records']
    };
  }

  if (jsonData.length === 0) {
    return {
      data: [],
      valid: true,
      warnings: ['CSV file contains no match data records'],
      errors: []
    };
  }

  const errors = [];
  const warnings = [];
  
  // First, normalize timestamps in MM/DD/YYYY format
  const normalizedData = normalizeTimestamps(jsonData);
  
  // Track which records had their timestamps converted
  const convertedTimestamps = [];
  normalizedData.forEach((record, index) => {
    if (jsonData[index].timestamp !== record.timestamp) {
      convertedTimestamps.push(`Row ${index + 1}: Converted date '${jsonData[index].timestamp}' to timestamp '${record.timestamp}'`);
    }
  });
  
  if (convertedTimestamps.length > 0) {
    warnings.push(...convertedTimestamps);
  }
  
  const processedData = [];

  // Process and validate each record
  normalizedData.forEach((record, index) => {
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
    
    // Make sure yourDeck and opponentDeck objects exist
    if (!processedRecord.yourDeck) {
      processedRecord.yourDeck = { primary: null, secondary: null, variant: null };
      errors.push(`Row ${index + 1}: Missing 'yourDeck' information - created empty object`);
    }
    
    if (!processedRecord.opponentDeck) {
      processedRecord.opponentDeck = { primary: null, secondary: null, variant: null };
      errors.push(`Row ${index + 1}: Missing 'opponentDeck' information - created empty object`);
    }
    
    // Validate the record for other issues (not ID, isLocked or notes related)
    const rowErrors = validateMatchRecord(processedRecord, index + 1);
    errors.push(...rowErrors);
    
    processedData.push(processedRecord);
  });

  // Perform common validations
  const commonValidations = _performCommonValidations(processedData);
  errors.push(...commonValidations.errors);
  warnings.push(...commonValidations.warnings);

  return {
    data: processedData,
    valid: errors.length === 0 || errors.every(e => e.includes('automatically')),
    errors,
    warnings
  };
};

/**
 * Performs strict validation on parsed CSV data without any automatic correction
 * @param {Object} jsonData - Parsed JSON data from CSV
 * @returns {Object} Validation result with detailed errors if any
 */
export const validateCsvData = (jsonData) => {
  if (!Array.isArray(jsonData)) {
    return {
      valid: false,
      errors: ['Invalid data format: Expected an array of match records']
    };
  }

  if (jsonData.length === 0) {
    return {
      valid: true,
      warnings: ['CSV file contains no match data records'],
      errors: []
    };
  }

  const errors = [];
  const warnings = [];

  // Validate each record in the data
  jsonData.forEach((record, index) => {
    const rowErrors = validateMatchRecord(record, index + 1);
    errors.push(...rowErrors);
  });

  // Perform common validations
  const commonValidations = _performCommonValidations(jsonData);
  errors.push(...commonValidations.errors);
  warnings.push(...commonValidations.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Performs deep validation on CSV file content
 * @param {string} csvContent - Raw CSV file content 
 * @returns {Object} Validation results with stats
 */
export const analyzeCsvFile = (csvContent) => {
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
};