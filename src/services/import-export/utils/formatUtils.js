/**
 * Utilities for CSV format manipulation
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
