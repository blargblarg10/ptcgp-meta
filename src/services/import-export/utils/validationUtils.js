/**
 * Utilities for data validation
 */

/**
 * Find duplicate values in an array
 * @param {Array} array - Array to check for duplicates
 * @returns {Array} Array of duplicate values
 */
export function findDuplicates(array) {
  const seen = {};
  const duplicates = [];

  array.forEach(item => {
    if (seen[item]) {
      if (!duplicates.includes(item)) {
        duplicates.push(item);
      }
    } else {
      seen[item] = true;
    }
  });

  return duplicates;
}

/**
 * Helper function to create detailed error messages
 * @param {number} rowNum - Row number for error reporting
 * @param {string} field - Field name
 * @param {any} value - Field value
 * @param {string} message - Error message
 * @returns {string} Formatted error message
 */
export function createDetailedError(rowNum, field, value, message) {
  const displayValue = value === undefined ? 'undefined' : 
                       value === null ? 'null' : 
                       typeof value === 'object' ? JSON.stringify(value) : 
                       `"${value}"`;
  return `Row ${rowNum}: ${message} - Field: ${field}, Value: ${displayValue}`;
}

/**
 * Validates timestamps in records
 * @param {Array} records - Array of records to validate
 * @param {boolean} allowFutureDates - Whether to allow future dates
 * @returns {Object} Object with arrays of errors and warnings
 */
export function validateTimestamps(records, allowFutureDates = false) {
  const warnings = [];
  const errors = [];
  
  if (!Array.isArray(records)) {
    return { errors: ['Invalid data: expected an array of records'], warnings: [] };
  }
  
  const now = new Date();
  
  records.forEach((record, index) => {
    if (!record.timestamp) {
      errors.push(createDetailedError(index + 1, 'timestamp', record.timestamp, 'Missing required field'));
      return;
    }
    
    if (isNaN(Date.parse(record.timestamp))) {
      errors.push(createDetailedError(index + 1, 'timestamp', record.timestamp, 'Invalid timestamp format'));
      return;
    }
    
    if (!allowFutureDates) {
      const recordDate = new Date(record.timestamp);
      if (recordDate > now) {
        warnings.push(`Row ${index + 1}: Match timestamp is in the future: ${record.timestamp}`);
      }
    }
  });
  
  return { errors, warnings };
}

/**
 * Validates unique IDs in records
 * @param {Array} records - Array of records to validate
 * @returns {Object} Object with arrays of errors and warnings
 */
export function validateUniqueIds(records) {
  const errors = [];
  const warnings = [];
  
  if (!Array.isArray(records)) {
    return { errors: ['Invalid data: expected an array of records'], warnings: [] };
  }
  
  const ids = records.map(record => record.id).filter(id => id != null);
  const duplicateIds = findDuplicates(ids);
  
  if (duplicateIds.length > 0) {
    errors.push(`Found duplicate match IDs: ${duplicateIds.join(', ')}`);
  }
  
  return { errors, warnings };
}
