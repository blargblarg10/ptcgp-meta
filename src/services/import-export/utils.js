/**
 * Shared utility functions for CSV and JSON data processing
 */

/**
 * Helper function to properly parse CSV rows, handling quoted values
 * @param {string} row - CSV row string
 * @returns {Array} Array of values from the row
 */
export function parseCSVRow(row) {
  const result = [];
  let insideQuotes = false;
  let currentValue = '';
  let i = 0;
  
  while (i < row.length) {
    const char = row[i];
    
    if (char === '"') {
      if (i + 1 < row.length && row[i + 1] === '"') {
        // Handle escaped quotes - "" becomes " inside a quoted string
        currentValue += '';
        i++;
      } else {
        // Toggle quote mode
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // End of field
      result.push(currentValue);
      currentValue = '';
    } else {
      // Add character to current value
      currentValue += char;
    }
    
    i++;
  }
  
  // Add the last field
  result.push(currentValue);
  
  return result;
}

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
 * Filter CSV content, removing blank lines and comments
 * @param {string} csvContent - Raw CSV content
 * @returns {Array} Array of filtered CSV rows
 */
export function filterCsvContent(csvContent) {
  if (!csvContent || typeof csvContent !== 'string') {
    return [];
  }
  
  return csvContent
    .split(/\r?\n/)
    .filter(line => {
      const trimmedLine = line.trim();
      return trimmedLine !== '' && !trimmedLine.startsWith('#');
    });
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
 * Download data as a file
 * @param {string} content - File content
 * @param {string} fileName - File name
 * @param {string} contentType - MIME type
 */
export function downloadFile(content, fileName, contentType) {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}
