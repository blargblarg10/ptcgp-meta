/**
 * Import-Export module
 * @module import-export
 * @description Central module for import/export functionality, acting as the public API
 */

// Re-export converters
import { convertCsvToJson } from './converters/csvConverter';
import { convertJsonToCsv } from './converters/jsonConverter';

// Re-export validators
import { validateCsvStructure, validateJsonStructure } from './validators/structureValidator';
import { validateMatchRecords } from './validators/businessRuleValidator';

// Re-export processors
import { preprocessMatchData } from './processors/dataPreprocessor';

// Re-export utilities
import { downloadFile } from './utils/fileUtils';

/**
 * Full CSV processing pipeline: Convert, process, and validate CSV data in one call
 * @param {string} csvContent - Raw CSV file content
 * @returns {Object} Processed results with data, validation status, and any errors/warnings
 */
export function processImportCsv(csvContent) {
  // First, analyze basic structure
  const structureValidation = validateCsvStructure(csvContent);
  
  // If structure is completely invalid, return early
  if (!structureValidation.valid && structureValidation.errors.some(e => 
    e.includes('Invalid CSV content') || 
    e.includes('must contain at least a header')
  )) {
    return {
      data: [],
      valid: false,
      errors: structureValidation.errors,
      warnings: structureValidation.warnings || [],
      stats: structureValidation.stats || {}
    };
  }
  
  // Convert CSV to JSON
  const { data, errors: conversionErrors, warnings: conversionWarnings } = convertCsvToJson(csvContent);
  
  if (conversionErrors && conversionErrors.length > 0) {
    return {
      data: [],
      valid: false,
      errors: conversionErrors,
      warnings: conversionWarnings || [],
      stats: structureValidation.stats
    };
  }
  
  // Preprocess the data (normalize formats, add defaults)
  const { data: processedData, warnings: processingWarnings } = preprocessMatchData(data);
  
  // Validate the data against business rules
  const validationResult = validateMatchRecords(processedData);
  
  // Return the complete result
  return {
    data: processedData,
    valid: validationResult.valid,
    errors: validationResult.errors || [],
    warnings: [
      ...(structureValidation.warnings || []), 
      ...(conversionWarnings || []),
      ...(processingWarnings || []),
      ...(validationResult.warnings || [])
    ],
    stats: structureValidation.stats
  };
}

/**
 * Exports match data to CSV format and triggers download
 * @param {Array} jsonData - Array of match data objects
 * @param {string} fileName - Name of the file to download
 * @returns {boolean} Success status
 */
export function exportMatchesToCsv(jsonData, fileName = 'match-data.csv') {
  if (!Array.isArray(jsonData) || jsonData.length === 0) {
    console.error('Export error: No data to export');
    return false;
  }
  
  try {
    // Convert JSON to CSV
    const csvContent = convertJsonToCsv(jsonData);
    
    // Download the file
    downloadFile(csvContent, fileName, 'text/csv');
    return true;
  } catch (error) {
    console.error('Export error:', error);
    return false;
  }
}

// Export individual functions for more granular usage
export {
  // Converters
  convertCsvToJson,
  convertJsonToCsv,
  
  // Validators
  validateCsvStructure,
  validateJsonStructure,
  validateMatchRecords,
  
  // Processors
  preprocessMatchData,
  
  // Utilities
  downloadFile
};
