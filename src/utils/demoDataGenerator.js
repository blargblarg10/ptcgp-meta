import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * @fileoverview Utility module for generating sample match data for demonstration purposes.
 * Contains functions to create random deck color combinations and match results based on predefined weights and probabilities.
 * 
 * @module demoDataGenerator
 * @description Generates mock Pokemon Trading Card Game match data with weighted deck color combinations,
 * realistic result distributions based on deck strengths, and timestamps within a 30-day range.
 * 
 * @typedef {Object} DeckPair
 * @property {string} primary - Primary deck color
 * @property {string|null} secondary - Secondary deck color (can be null for mono-color decks)
 * @property {number} playerWeight - Weight value for player deck selection probability
 * @property {number} opponentWeight - Weight value for opponent deck selection probability
 * @property {number} strength - Deck strength rating (1-100)
 */

const DECK_PAIRS = [
    { primary: "A2b-35",  secondary: "A2-110",  playerWeight: 30, opponentWeight: 184, strength: 90},  // Giratina EX  -  Darkrai EX
    { primary: "A1a-18",  secondary: "A2-50",   playerWeight: 40, opponentWeight: 100, strength: 85},  // Gyarados EX  -  Manaphy
    { primary: "A2b-35",  secondary: "A1-129",  playerWeight: 2,  opponentWeight: 62,  strength: 82},  // Giratina EX  -  Mewtwo EX
    { primary: "A2-95",   secondary: "A1-154",  playerWeight: 0,  opponentWeight: 60,  strength: 75},  // Gallade EX   -  Hitmonlee
    { primary: "A2-119",  secondary: "A2a-71",  playerWeight: 0,  opponentWeight: 46,  strength: 78},  // Dialga EX    -  Arceus EX
    { primary: "A1-36",   secondary: "A1-47",   playerWeight: 0,  opponentWeight: 41,  strength: 67},  // Charizard EX -  Moltres EX
    { primary: "A2-89",   secondary: "A2-92",   playerWeight: 30, opponentWeight: 31,  strength: 80},  // Rampados     -  Lucario
    { primary: "A2b-7",   secondary: "A2b-3",   playerWeight: 0,  opponentWeight: 30,  strength: 50},  // Mewoscarada  -  Beedrill EX
    { primary: "A2a-55",  secondary: "A2b-7",   playerWeight: 2,  opponentWeight: 28,  strength: 61},  // Magnexone    -  Meowscarada
    { primary: "A2-99",   secondary: "A2-110",  playerWeight: 1,  opponentWeight: 25,  strength: 63}   // Weavile EX   -  Darkrai EX
];

// Generate deck by selecting a predefined color pair using weights
const generateDeck = (isPlayer = true) => {
    const weights = isPlayer ? 
        DECK_PAIRS.map(pair => pair.playerWeight) : 
        DECK_PAIRS.map(pair => pair.opponentWeight);
    
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < DECK_PAIRS.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return {
                primary: DECK_PAIRS[i].primary,
                secondary: DECK_PAIRS[i].secondary,
                strength: DECK_PAIRS[i].strength
            };
        }
    }
    return DECK_PAIRS[0]; // Fallback
};

// Calculate match result based on deck strengths and turn order
const selectResult = (yourDeck, opponentDeck, turnOrder) => {
    // Base win chance on deck strength difference
    const strengthDiff = yourDeck.strength - opponentDeck.strength;
    
    // Turn order advantage (going first gives +5 to strength)
    const turnBonus = turnOrder === "first" ? 5 : 0;
    
    // Calculate final win probability
    const totalDiff = strengthDiff + turnBonus;
    const winChance = 0.5 + (totalDiff / 200); // Convert strength diff to probability shift
    
    // Add small random factor and determine result
    const random = Math.random();
    if (random < 0.01) return "draw"; // 1% chance of draw
    return random < winChance ? "victory" : "defeat";
};

const generateSampleData = (numMatches = 500) => {
    const data = [];
    const baseDate = new Date();
    
    for (let i = 0; i < numMatches; i++) {
        const timestamp = new Date(baseDate);
        timestamp.setDate(timestamp.getDate() - Math.floor(Math.random() * 60));
        
        const turnOrder = Math.random() > 0.5 ? "first" : "second";
        const yourDeck = generateDeck(true);
        const opponentDeck = generateDeck(false);
          const match = {
            yourDeck: {
                primary: yourDeck.primary,
                secondary: yourDeck.secondary,
                variant: Math.random() < 0.3 ? generateDeck(true).primary : null // 30% chance of having a variant
            },
            opponentDeck: {
                primary: opponentDeck.primary,
                secondary: opponentDeck.secondary,
                variant: Math.random() < 0.3 ? generateDeck(false).primary : null // 30% chance of having a variant
            },
            turnOrder,
            result: selectResult(yourDeck, opponentDeck, turnOrder),
            isLocked: true,
            id: `match-${timestamp.getTime()}-${Math.random().toString(36).substring(2, 9)}`,
            timestamp: timestamp.toISOString()
        };
        
        data.push(match);
    }
    
    return data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

// Save match data to json file
const saveMatchData = (data, filename = './src/data/match_history.json') => {
  const filePath = join(__dirname, '..', '..', filename);
  writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Saved ${data.length} matches to ${filePath}`);
};

// Run as standalone script if called directly
const args = process.argv.slice(2);
const numMatches = parseInt(args[0]) || 500;
const filename = args[1] || './src/data/match_history.json';

console.log(`Generating ${numMatches} matches...`);
const data = generateSampleData(numMatches);
saveMatchData(data, filename);
