/**
 * Utility functions to convert between JSON and CSV formats for match data
 * 
 * @module dataFormatConverter
 * @description Handles conversion between different data formats and processing pipelines
 * @todo Consider refactoring this file to separate:
 * 1. Data format conversion (csvToJson, jsonToCsv) 
 * 2. Data validation (moved to validators/)
 * 3. Data processing (moved to processors/)
 */

import { EXPECTED_HEADERS, REQUIRED_HEADERS, VARIANT_HEADERS, MATCH_RECORD_FIELDS } from './constants';
import { parseCSVRow, filterCsvContent, downloadFile } from './utils';
import { validateCsvData, analyzeCsvFile, preprocessAndValidateCsvData } from './csvValidator';

/**
 * Converts match data from JSON to CSV format
 * @param {Array} jsonData - Array of match data objects
 * @returns {string} CSV string
 */
export const jsonToCsv = (jsonData) => {
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
        
        // Handle different data types for nested properties
        if (value === null || value === undefined || value === "null") {
          return '""';
        } else if (typeof value === 'boolean') {
          return value.toString();
        } else {
          return `"${value.toString().replace(/"/g, '""')}"`;
        }
      } else {
        // Handle normal properties
        const value = item[header];
        
        // Handle different data types
        if (value === null || value === undefined || value === "null") {
          return '""';
        } else if (typeof value === 'boolean') {
          return value.toString();
        } else {
          return `"${value.toString().replace(/"/g, '""')}"`;
        }
      }
    });
    
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
};

/**
 * Converts match data from CSV to JSON format
 * @param {string} csvData - CSV string
 * @returns {Object} Object with parsed data and any validation errors
 */
export const csvToJson = (csvData) => {
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
    if (!headers.includes('id')) {
      item.id = null; // This will be auto-generated later
    }
    if (!headers.includes('isLocked')) {
      item.isLocked = true;
    }
    if (!headers.includes('notes')) {
      item.notes = "";
    }
    // Initialize points and auto with default values if not in headers
    if (!headers.includes('points')) {
      item.points = 0;
    }
    if (!headers.includes('auto')) {
      item.auto = true;
    }
    
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
    
    // Make sure yourDeck and opponentDeck objects exist    
    if (!item.yourDeck) {
      item.yourDeck = { primary: null, secondary: null, variant: null };
    } else if (!item.yourDeck.secondary) {
      item.yourDeck.secondary = null;
    } else if (!item.yourDeck.variant) {
      item.yourDeck.variant = null;
    }
    
    if (!item.opponentDeck) {
      item.opponentDeck = { primary: null, secondary: null, variant: null };
    } else if (!item.opponentDeck.secondary) {
      item.opponentDeck.secondary = null;
    } else if (!item.opponentDeck.variant) {
      item.opponentDeck.variant = null;
    }
    
    // Ensure points and auto fields exist with default values if missing
    if (item.points === undefined || item.points === null) {
      item.points = 0;
    }
    if (item.auto === undefined || item.auto === null) {
      item.auto = true;
    }

    jsonData.push(item);
  }

  return { data: jsonData, errors, warnings };
};

/**
 * Validates the JSON data structure to ensure it only contains expected fields
 * @param {Array} jsonData - Array of match data objects
 * @returns {Object} Object with validation result and any errors
 */
export const validateJsonStructure = (jsonData) => {
  if (!Array.isArray(jsonData)) {
    return { valid: false, errors: ['Data must be an array'] };
  }
  
  if (jsonData.length === 0) {
    return { valid: true, errors: [] }; // Empty array is valid
  }
  
  const errors = [];
  
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
    if (item.yourDeck) {
      Object.keys(item.yourDeck).forEach(key => {
        if (!['primary', 'secondary', 'variant'].includes(key)) {
          errors.push(`Row ${index + 1}: Unexpected field 'yourDeck.${key}'`);
        }
      });
    }
    
    if (item.opponentDeck) {
      Object.keys(item.opponentDeck).forEach(key => {
        if (!['primary', 'secondary', 'variant'].includes(key)) {
          errors.push(`Row ${index + 1}: Unexpected field 'opponentDeck.${key}'`);
        }
      });
    }
  });
  
  return { valid: errors.length === 0, errors };
};

/**
 * Analyzes a CSV file to check basic structure and identify issues
 * @param {string} csvContent - Raw CSV file content 
 * @returns {Object} Validation results with stats
 */
export const analyzeCSV = (csvContent) => {
  return analyzeCsvFile(csvContent);
};

/**
 * Validates CSV data after it has been parsed to JSON
 * @param {Object} jsonData - Parsed JSON data from CSV
 * @returns {Object} Validation result with detailed errors if any
 */
export const validateCSV = (jsonData) => {
  return validateCsvData(jsonData);
};

/**
 * Preprocesses and validates CSV data, automatically adding missing required fields
 * @param {Object} jsonData - Parsed JSON data from CSV
 * @returns {Object} Processed data with validation results
 */
export const processAndValidateCSV = (jsonData) => {
  return preprocessAndValidateCsvData(jsonData);
};

/**
 * Full CSV processing pipeline: Convert, process, and validate CSV data in one call
 * @param {string} csvContent - Raw CSV file content
 * @returns {Object} Processed results with data, validation status, and any errors/warnings
 */
export const processCSV = (csvContent) => {
  // First, analyze basic structure
  const structureAnalysis = analyzeCSV(csvContent);
  
  // If structure is completely invalid, return early
  if (!structureAnalysis.valid && structureAnalysis.errors.some(e => 
    e.includes('Invalid CSV content') || 
    e.includes('must contain at least a header')
  )) {
    return {
      data: [],
      valid: false,
      errors: structureAnalysis.errors,
      warnings: structureAnalysis.warnings || [],
      stats: structureAnalysis.stats || {}
    };
  }
  
  // Convert CSV to JSON
  const { data, errors, warnings } = csvToJson(csvContent);
  
  if (errors && errors.length > 0) {
    return {
      data: [],
      valid: false,
      errors,
      warnings: warnings || [],
      stats: structureAnalysis.stats
    };
  }
  
  // Process and validate the data
  const processedResult = processAndValidateCSV(data);
  
  // Return the complete result
  return {
    data: processedResult.data,
    valid: processedResult.valid,
    errors: processedResult.errors || [],
    warnings: [...(structureAnalysis.warnings || []), ...(processedResult.warnings || [])],
    stats: structureAnalysis.stats
  };
};

// Re-export downloadFile from utils for backward compatibility
export { downloadFile };