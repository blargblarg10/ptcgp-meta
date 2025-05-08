/**
 * Utility functions to convert between JSON and CSV formats for match data
 */

// Expected headers for match data CSV
const EXPECTED_HEADERS = [
  'id',
  'timestamp',
  'yourDeck.primary',
  'yourDeck.secondary',
  'opponentDeck.primary',
  'opponentDeck.secondary',
  'turnOrder',
  'result',
  'isLocked'
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
  
  // Validate headers
  const missingHeaders = EXPECTED_HEADERS.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return { 
      data: [], 
      errors: [`Missing required headers: ${missingHeaders.join(', ')}`] 
    };
  }

  const jsonData = [];
  const errors = [];

  // Convert each CSV row to a JSON object
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i].trim()) continue; // Skip empty rows
    
    const values = parseCSVRow(rows[i]);
    if (values.length !== headers.length) {
      errors.push(`Row ${i + 1}: Column count mismatch. Expected ${headers.length}, got ${values.length}`);
      continue;
    }

    const item = {};
    
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
          item[header] = value === "" ? null : parseInt(value, 10);
        } else {
          item[header] = value === "" ? null : value;
        }
      }
    });

    jsonData.push(item);
  }

  return { data: jsonData, errors };
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
      if (!['id', 'timestamp', 'yourDeck', 'opponentDeck', 'turnOrder', 'result', 'isLocked'].includes(key)) {
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