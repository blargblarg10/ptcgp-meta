/**
 * Constants for field names and data structures
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
