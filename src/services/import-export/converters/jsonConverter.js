/**
 * JSON Converter module
 * @module converters/jsonConverter
 * @description Pure conversion functions for JSON data format
 */

import { EXPECTED_HEADERS } from '../constants/fieldConstants';

/**
 * Converts match data from JSON objects to CSV string format
 * @param {Array} jsonData - Array of match data objects to convert to CSV
 * @returns {string} Formatted CSV string
 */
export const convertJsonToCsv = (jsonData) => {
  if (!Array.isArray(jsonData) || jsonData.length === 0) {
    return '';
  }
  
  // Create CSV header row
  const csvRows = [EXPECTED_HEADERS.join(',')];

  // Convert each JSON object to a CSV row
  jsonData.forEach(item => {
    const row = EXPECTED_HEADERS.map(header => {
      if (header.includes('.')) {
        // Handle nested properties
        const [parent, child] = header.split('.');
        const value = item[parent] && item[parent][child];
        
        return formatCsvValue(value);
      } else {
        // Handle normal properties
        const value = item[header];
        return formatCsvValue(value);
      }
    });
    
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
};

/**
 * Formats a value for CSV output, handling different data types
 * @param {any} value - Value to format
 * @returns {string} Formatted value ready for CSV
 * @private
 */
function formatCsvValue(value) {
  if (value === null || value === undefined || value === "null") {
    return '""';
  } else if (typeof value === 'boolean') {
    return value.toString();
  } else {
    return `"${value.toString().replace(/"/g, '""')}"`;
  }
}
