/**
 * Utility functions to convert between JSON and CSV formats for match data
 */

import { validateCsvData, analyzeCsvFile, preprocessAndValidateCsvData } from './csvValidator';

// Expected headers for match data CSV
export const EXPECTED_HEADERS = [
  'id',
  'timestamp',
  'yourDeck.primary',
  'yourDeck.secondary',
  'opponentDeck.primary',
  'opponentDeck.secondary',
  'turnOrder',
  'result',
  'isLocked',
  'notes'
];

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
        return item[parent] && item[parent][child] !== undefined 
          ? `"${item[parent][child]}"` 
          : '""';
      } else {
        // Handle normal properties
        const value = item[header];
        
        // Handle different data types
        if (value === null || value === undefined) {
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

  const rows = csvData.split(/\r?\n/);
  if (rows.length < 2) { // Need at least header row and one data row
    return { data: [], errors: ['CSV file must contain at least a header row and one data row'] };
  }

  // Extract headers
  const headers = rows[0].split(',').map(h => h.trim());
  
  // These headers are required
  const REQUIRED_HEADERS = EXPECTED_HEADERS.filter(h => 
    !['id', 'isLocked', 'notes'].includes(h)
  );
  
  // Validate only required headers
  const missingRequiredHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
  
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
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i].trim()) continue; // Skip empty rows
    
    const values = parseCSVRow(rows[i]);
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
    
    headers.forEach((header, index) => {
      const value = values[index].trim();
      
      if (header.includes('.')) {
        // Handle nested properties
        const [parent, child] = header.split('.');
        if (!item[parent]) {
          item[parent] = {};
        }
        item[parent][child] = value === "" ? null : value;
      } else {
        // Parse values according to expected types
        if (header === 'isLocked') {
          item[header] = value.toLowerCase() === 'true';
        } else if (header === 'turnOrder') {
          item[header] = value === "" ? null : value;
        } else {
          item[header] = value === "" ? null : value;
        }
      }
    });

    // Make sure yourDeck and opponentDeck objects exist
    if (!item.yourDeck) {
      item.yourDeck = { primary: null, secondary: null };
    } else if (!item.yourDeck.secondary) {
      item.yourDeck.secondary = null;
    }
    
    if (!item.opponentDeck) {
      item.opponentDeck = { primary: null, secondary: null };
    } else if (!item.opponentDeck.secondary) {
      item.opponentDeck.secondary = null;
    }

    jsonData.push(item);
  }

  return { data: jsonData, errors, warnings };
};

/**
 * Helper function to properly parse CSV rows, handling quoted values
 * @param {string} row - CSV row string
 * @returns {Array} Array of values from the row
 */
function parseCSVRow(row) {
  const result = [];
  let insideQuotes = false;
  let currentValue = '';
  let i = 0;
  
  while (i < row.length) {
    const char = row[i];
    
    if (char === '"') {
      if (i + 1 < row.length && row[i + 1] === '"') {
        // Handle escaped quotes - "" becomes " inside a quoted string
        currentValue += '"';
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
      if (!['id', 'timestamp', 'yourDeck', 'opponentDeck', 'turnOrder', 'result', 'isLocked', 'notes'].includes(key)) {
        errors.push(`Row ${index + 1}: Unexpected field '${key}'`);
      }
    });
    
    // Check deck objects for extra fields
    if (item.yourDeck) {
      Object.keys(item.yourDeck).forEach(key => {
        if (!['primary', 'secondary'].includes(key)) {
          errors.push(`Row ${index + 1}: Unexpected field 'yourDeck.${key}'`);
        }
      });
    }
    
    if (item.opponentDeck) {
      Object.keys(item.opponentDeck).forEach(key => {
        if (!['primary', 'secondary'].includes(key)) {
          errors.push(`Row ${index + 1}: Unexpected field 'opponentDeck.${key}'`);
        }
      });
    }
  });
  
  return { valid: errors.length === 0, errors };
};

/**
 * Download data as a file
 * @param {string} content - File content
 * @param {string} fileName - File name
 * @param {string} contentType - MIME type
 */
export const downloadFile = (content, fileName, contentType) => {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
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