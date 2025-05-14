/**
 * Shared constants for CSV and JSON data processing
 */

// Expected headers for match data CSV
export const EXPECTED_HEADERS = [
  'id',
  'timestamp',
  'yourDeck.primary',
  'yourDeck.secondary',
  'yourDeck.variant',
  'opponentDeck.primary',
  'opponentDeck.secondary',
  'opponentDeck.variant',
  'turnOrder',
  'result',
  'isLocked',
  'notes',
  'points',
  'auto'
];

// Optional headers that will be auto-populated if missing
export const OPTIONAL_HEADERS = ['id', 'isLocked', 'notes', 'points', 'auto'];

// Required headers that must be present in the CSV
export const REQUIRED_HEADERS = EXPECTED_HEADERS.filter(h => 
  !OPTIONAL_HEADERS.includes(h)
);

// Optional variant headers
export const VARIANT_HEADERS = ['yourDeck.variant', 'opponentDeck.variant'];

// Expected fields in a deck object
export const DECK_FIELDS = ['primary', 'secondary', 'variant'];

// Expected root fields in a match record
export const MATCH_RECORD_FIELDS = [
  'id', 
  'timestamp', 
  'yourDeck', 
  'opponentDeck', 
  'turnOrder', 
  'result', 
  'isLocked', 
  'notes', 
  'points', 
  'auto'
];

// Valid values for turn order
export const VALID_TURN_ORDER_VALUES = ['first', 'second', '1', '2'];

// Valid values for match result
export const VALID_RESULT_VALUES = ['win', 'loss', 'tie', 'victory', 'defeat'];

// Default values for optional fields
export const DEFAULT_VALUES = {
  id: null, // Will be generated
  isLocked: true,
  notes: "",
  points: 0,
  auto: true
};

// ID format patterns
export const ID_PATTERNS = [
  /^match-\d+-[a-z0-9]+$/,
  /^new-\d+-[a-z0-9]+$/
];

// Date format regex for MM/DD/YYYY
export const DATE_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
