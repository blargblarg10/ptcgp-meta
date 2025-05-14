# Import-Export Module

This module handles CSV and JSON data conversion, validation, and processing for match data.

## Directory Structure

The module is organized into the following directories:

- **converters/** - Pure format conversion logic
  - `csvConverter.js` - Converts between CSV and JSON
  - `jsonConverter.js` - JSON manipulation functions

- **validators/** - Validation logic
  - `structureValidator.js` - Validates data structure
  - `businessRuleValidator.js` - Validates business rules

- **processors/** - Data processing logic
  - `dataPreprocessor.js` - Data normalization and enrichment

- **utils/** - Utility functions
  - `fileUtils.js` - File operations
  - `formatUtils.js` - Format manipulation utilities
  - `validationUtils.js` - Validation helpers

- **constants/** - Constants and configuration
  - `fieldConstants.js` - Field names and structure
  - `validationConstants.js` - Validation rules
  - `defaultValues.js` - Default values

## Usage

Import the functions you need from the main module:

```javascript
// Use the main processing pipeline
import { processImportCsv, exportMatchesToCsv } from '../services/import-export';

// Or import specific functions
import { convertCsvToJson } from '../services/import-export';
import { validateMatchRecords } from '../services/import-export';
```

## Migration Guide

If you're using the old functions, here's how to migrate:

| Old Function | New Function |
|-------------|-------------|
| `csvToJson` | `convertCsvToJson` |
| `jsonToCsv` | `convertJsonToCsv` |
| `validateCsvData` | `validateMatchRecords` |
| `analyzeCsvFile` | `validateCsvStructure` |
| `validateJsonStructure` | `validateJsonStructure` (unchanged) |
| `preprocessAndValidateCsvData` | Use `preprocessMatchData` followed by `validateMatchRecords` |
| `processCSV` | `processImportCsv` |
| `downloadFile` | `downloadFile` (unchanged) |

## API

### Main Functions

- `processImportCsv(csvContent)` - Full CSV processing pipeline
- `exportMatchesToCsv(jsonData, fileName)` - Export data to CSV

### Converters

- `convertCsvToJson(csvData)` - Convert CSV string to JSON objects
- `convertJsonToCsv(jsonData)` - Convert JSON objects to CSV string

### Validators

- `validateCsvStructure(csvContent)` - Validate CSV structure
- `validateJsonStructure(jsonData)` - Validate JSON structure
- `validateMatchRecords(records)` - Validate match records against business rules

### Processors

- `preprocessMatchData(jsonData)` - Preprocess match data (normalize, add defaults)
- `normalizeTimestamps(jsonData)` - Convert date formats to ISO timestamps
- `addDefaultValues(jsonData)` - Add missing fields with default values

### Utilities

- `downloadFile(content, fileName, contentType)` - Download data as a file
