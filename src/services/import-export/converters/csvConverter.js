/**
 * CSV Converter module
 * @module converters/csvConverter
 * @description Pure conversion functions for CSV data format
 */

import { EXPECTED_HEADERS, REQUIRED_HEADERS, VARIANT_HEADERS } from '../constants/fieldConstants';
import { DEFAULT_VALUES } from '../constants/defaultValues';
import { parseCSVRow, filterCsvContent } from '../utils/formatUtils';

/**
 * Converts match data from CSV string to JSON objects
 * @param {string} csvData - Raw CSV string to convert
 * @returns {Object} Object with parsed data, errors, and warnings
 */
export const convertCsvToJson = (csvData) => {
  if (!csvData || typeof csvData !== 'string') {
    return { data: [], errors: ['Invalid CSV data'] };
  }

  // Filter out blank lines and comment lines that start with #
  const filteredRows = filterCsvContent(csvData);

  if (filteredRows.length < 2) { // Need at least header row and one data row
    return { data: [], errors: ['CSV file must contain at least a header row and one data row'] };
  }
  
  // Extract headers
  const headers = filteredRows[0].split(',').map(h => h.trim());
  
  // Validate only required headers
  const missingRequiredHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h) && !VARIANT_HEADERS.includes(h));
  
  if (missingRequiredHeaders.length > 0) {
    return { 
      data: [], 
      errors: [`Missing required headers: ${missingRequiredHeaders.join(', ')}`] 
    };
  }
  
  const jsonData = [];
  const errors = [];
  const warnings = [];

  // Convert each CSV row to a JSON object
  for (let i = 1; i < filteredRows.length; i++) {
    if (!filteredRows[i].trim()) continue; // Skip empty rows (additional check)
    
    const values = parseCSVRow(filteredRows[i]);
    if (values.length !== headers.length) {
      errors.push(`Row ${i + 1}: Column count mismatch. Expected ${headers.length}, got ${values.length}`);
      continue;
    }

    const item = {};
    
    // Initialize optional fields with default values
    Object.entries(DEFAULT_VALUES).forEach(([field, defaultValue]) => {
      if (!headers.includes(field)) {
        item[field] = defaultValue;
      }
    });
    
    headers.forEach((header, index) => {
      const value = values[index].trim();
      if (header.includes('.')) {
        // Handle nested properties
        const [parent, child] = header.split('.');
        if (!item[parent]) {
          item[parent] = {};
        }
        // Fix for handling "null" string values
        if (value === "null" || value === "") {
          item[parent][child] = null;
        } else {
          item[parent][child] = value === "" ? null : value;
        }
      } else {        
        // Parse values according to expected types
        if (header === 'isLocked') {
          item[header] = value.toLowerCase() === 'true';
        } else if (header === 'turnOrder') {
          item[header] = value === "" || value === "null" ? null : value;
        } else if (header === 'points') {
          // Parse points as a number, default to 0 if invalid
          const parsedPoints = parseInt(value, 10);
          item[header] = isNaN(parsedPoints) ? 0 : parsedPoints;
        } else if (header === 'auto') {
          // Parse auto as a boolean, default to true if invalid
          item[header] = value.toLowerCase() !== 'false';
        } else {
          item[header] = value === "" || value === "null" ? null : value;
        }
      }
    });
    
    // Make sure deck objects have complete structure
    ['yourDeck', 'opponentDeck'].forEach(deckField => {
      if (!item[deckField]) {
        item[deckField] = { primary: null, secondary: null, variant: null };
      } else {
        if (item[deckField].secondary === undefined) item[deckField].secondary = null;
        if (item[deckField].variant === undefined) item[deckField].variant = null;
      }
    });
    
    jsonData.push(item);
  }

  return { data: jsonData, errors, warnings };
};
