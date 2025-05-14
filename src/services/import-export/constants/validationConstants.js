/**
 * Constants for validation rules and patterns
 */

// Valid values for turn order
export const VALID_TURN_ORDER_VALUES = ['first', 'second', '1', '2'];

// Valid values for match result
export const VALID_RESULT_VALUES = ['win', 'loss', 'tie', 'victory', 'defeat'];

// ID format patterns
export const ID_PATTERNS = [
  /^match-\d+-[a-z0-9]+$/,
  /^new-\d+-[a-z0-9]+$/
];

// Date format regex for MM/DD/YYYY
export const DATE_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
