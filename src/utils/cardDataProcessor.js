import cardData from '../data/card_data.json';

// First, group cards by name to identify duplicates
const cardsByName = Object.entries(cardData.cards)
  .filter(([_, card]) => card.finalEvolution)
  .filter(([_, card]) => card.cardType !== 'Trainer')
  .reduce((acc, [key, card]) => {
    if (!acc[card.cardName]) {
      acc[card.cardName] = [];
    }
    acc[card.cardName].push({ key, card });
    return acc;
  }, {});

// Process card data to get only final evolution cards with minimal data
export const AVAILABLE_CARDS = Object.entries(cardsByName)
  .flatMap(([cardName, cards]) => {
    // If there's only one card with this name, don't append the key
    if (cards.length === 1) {
      const { key, card } = cards[0];
      return [{
        key: key,
        displayName: card.cardName,
        name: card.cardName,
        element: card.cardElement,
        iconPath: card.iconPath,
      }];
    }
    
    // If there are multiple cards with the same name, append key to all of them
    return cards.map(({ key, card }) => ({
      key: key,
      displayName: `${card.cardName} ${key}`,
      name: card.cardName,
      element: card.cardElement,
      iconPath: card.iconPath,
    }));
  })
  .sort((a, b) => a.name.localeCompare(b.name));

// Group cards by element for dropdowns
export const CARDS_BY_ELEMENT = AVAILABLE_CARDS.reduce((acc, card) => {
  if (!acc[card.element]) {
    acc[card.element] = [];
  }
  acc[card.element].push(card);
  return acc;
}, {});

// Create a lookup map for quick access by key
const cardLookup = AVAILABLE_CARDS.reduce((acc, card) => {
  acc[card.key] = card;
  return acc;
}, {});

// Function to get card info by key
export const getCardInfo = (key) => cardLookup[key] || null;