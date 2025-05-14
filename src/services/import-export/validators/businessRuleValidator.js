/**
 * Business rule validator module
 * @module validators/businessRuleValidator
 * @description Validates match data against business rules
 */

import { AVAILABLE_CARDS } from '../../../shared/utils/cardDataProcessor';
import { 
  VALID_TURN_ORDER_VALUES, 
  VALID_RESULT_VALUES, 
  ID_PATTERNS 
} from '../constants/validationConstants';
import { 
  createDetailedError, 
  validateTimestamps, 
  validateUniqueIds 
} from '../utils/validationUtils';

/**
 * Validates a single match record against business rules
 * @param {Object} record - Match record object
 * @param {number} rowNum - Row number for error reporting
 * @returns {Array} Array of validation error messages
 */
export function validateMatchRecord(record, rowNum) {
  const errors = [];

  // Check ID format only if it exists (we don't require ID as it will be auto-generated)
  if (record.id && !ID_PATTERNS.some(pattern => pattern.test(record.id))) {
    errors.push(createDetailedError(rowNum, 'id', record.id, 'Invalid ID format'));
  }

  // Check timestamp format
  if (!record.timestamp) {
    errors.push(createDetailedError(rowNum, 'timestamp', record.timestamp, 'Missing required field'));
  } else if (isNaN(Date.parse(record.timestamp))) {
    errors.push(createDetailedError(rowNum, 'timestamp', record.timestamp, 'Invalid timestamp format'));
  }

  // Validate deck information
  if (!record.yourDeck) {
    errors.push(createDetailedError(rowNum, 'yourDeck', record.yourDeck, 'Missing yourDeck information'));
  } else {
    // Validate yourDeck fields
    errors.push(...validateDeckFields(record.yourDeck, 'yourDeck', rowNum));
  }
  
  if (!record.opponentDeck) {
    errors.push(createDetailedError(rowNum, 'opponentDeck', record.opponentDeck, 'Missing opponentDeck information'));
  } else {
    // Validate opponentDeck fields
    errors.push(...validateDeckFields(record.opponentDeck, 'opponentDeck', rowNum));
  }

  // Validate turn order
  if (!record.turnOrder) {
    errors.push(createDetailedError(rowNum, 'turnOrder', record.turnOrder, 'Missing required field'));
  } else if (!VALID_TURN_ORDER_VALUES.includes(String(record.turnOrder).toLowerCase())) {
    errors.push(createDetailedError(rowNum, 'turnOrder', record.turnOrder, 'Invalid value (must be "first", "second", 1, or 2)'));
  }

  // Validate match result
  if (!record.result) {
    errors.push(createDetailedError(rowNum, 'result', record.result, 'Missing required field'));
  } else if (!VALID_RESULT_VALUES.includes(String(record.result).toLowerCase())) {
    errors.push(createDetailedError(rowNum, 'result', record.result, 'Invalid value (must be "victory", "defeat", "win", "loss", or "tie")'));
  }

  return errors;
}

/**
 * Validates deck fields against card database
 * @param {Object} deck - Deck object with primary, secondary, variant fields
 * @param {string} deckName - Name of the deck (yourDeck or opponentDeck)
 * @param {number} rowNum - Row number for error reporting
 * @returns {Array} Array of validation error messages
 * @private
 */
function validateDeckFields(deck, deckName, rowNum) {
  const errors = [];
  const availableCardKeys = AVAILABLE_CARDS.map(card => card.key);
  
  // Check primary card
  if (!deck.primary) {
    errors.push(createDetailedError(rowNum, `${deckName}.primary`, deck.primary, 'Missing primary deck value'));
  } else if (!availableCardKeys.includes(deck.primary)) {
    errors.push(createDetailedError(rowNum, `${deckName}.primary`, deck.primary, 'Card does not exist in card database'));
  }
  
  // Check secondary card if present
  if (deck.secondary !== "null" && deck.secondary) {
    if (!availableCardKeys.includes(deck.secondary)) {
      errors.push(createDetailedError(rowNum, `${deckName}.secondary`, deck.secondary, 'Card does not exist in card database'));
    }
  }
  
  // Check variant card if present
  if (deck.variant !== "null" && deck.variant) {
    if (!availableCardKeys.includes(deck.variant)) {
      errors.push(createDetailedError(rowNum, `${deckName}.variant`, deck.variant, 'Card does not exist in card database'));
    }
  }
  
  return errors;
}

/**
 * Validates a collection of match records against business rules
 * @param {Array} records - Collection of match records to validate
 * @returns {Object} Validation results with errors and warnings
 */
export function validateMatchRecords(records) {
  if (!Array.isArray(records)) {
    return {
      valid: false,
      errors: ['Invalid data format: Expected an array of match records'],
      warnings: []
    };
  }

  if (records.length === 0) {
    return {
      valid: true,
      warnings: ['No match records to validate'],
      errors: []
    };
  }

  const errors = [];
  const warnings = [];

  // Validate each record in the data
  records.forEach((record, index) => {
    const rowErrors = validateMatchRecord(record, index + 1);
    errors.push(...rowErrors);
  });

  // Check for duplicate IDs and future timestamps
  const idValidation = validateUniqueIds(records);
  const timestampValidation = validateTimestamps(records);
  
  errors.push(...idValidation.errors);
  warnings.push(...idValidation.warnings);
  errors.push(...timestampValidation.errors);
  warnings.push(...timestampValidation.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
