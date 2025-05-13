import { getCardInfo } from './cardDataProcessor';

/**
 * Helper function to get deck display name from deck object
 */
const getDeckDisplayName = (deck) => {
  if (!deck.primary) return '';
  const primaryCard = getCardInfo(deck.primary);
  const secondaryCard = deck.secondary ? getCardInfo(deck.secondary) : null;
  const variantCard = deck.variant ? getCardInfo(deck.variant) : null;
  
  let displayName = primaryCard.displayName;
  
  if (secondaryCard) {
    displayName += ` | ${secondaryCard.displayName}`;
  }
  
  // if (variantCard) {
  //   displayName += ` | ${variantCard.displayName}`;
  // }
  
  return displayName;
};

/**
 * Calculates comprehensive match statistics from match data
 */
export const calculateStats = (matchData) => {
  // Calculate overall statistics
  const totalGames = matchData.length;
  const wins = matchData.filter(game => game.result === "victory").length;
  const losses = matchData.filter(game => game.result === "defeat").length;
  const draws = matchData.filter(game => game.result === "draw").length;
  const winRate = totalGames > 0 ? (wins / totalGames * 100).toFixed(2) : 0;

  // Calculate average turn
  const gamesWithTurnData = matchData.filter(game => game.turn !== null && game.turn !== undefined);
  const avgTurn = gamesWithTurnData.length > 0 
    ? (gamesWithTurnData.reduce((sum, game) => sum + game.turn, 0) / gamesWithTurnData.length).toFixed(1) 
    : null;

  // Calculate first vs second turn statistics
  const firstTurnGames = matchData.filter(game => game.turnOrder === "first").length;
  const secondTurnGames = matchData.filter(game => game.turnOrder === "second").length;
  const firstTurnWins = matchData.filter(game => game.turnOrder === "first" && game.result === "victory").length;
  const firstTurnLosses = matchData.filter(game => game.turnOrder === "first" && game.result === "defeat").length;
  const secondTurnWins = matchData.filter(game => game.turnOrder === "second" && game.result === "victory").length;
  const secondTurnLosses = matchData.filter(game => game.turnOrder === "second" && game.result === "defeat").length;

  // Calculate my deck color combinations
  const myDeckCounts = {};
  matchData.forEach(game => {
    const deckDisplayName = getDeckDisplayName(game.yourDeck);
    myDeckCounts[deckDisplayName] = (myDeckCounts[deckDisplayName] || 0) + 1;
  });

  // Calculate opponent deck color combinations
  const opponentDeckCounts = {};
  matchData.forEach(game => {
    const deckDisplayName = getDeckDisplayName(game.opponentDeck);
    opponentDeckCounts[deckDisplayName] = (opponentDeckCounts[deckDisplayName] || 0) + 1;
  });

  // Calculate statistics for each of my deck combinations
  const myDeckStats = {};
  Object.keys(myDeckCounts).forEach(deckDisplayName => {
    const deckGames = matchData.filter(game => {
      const gameDisplayName = getDeckDisplayName(game.yourDeck);
      return gameDisplayName === deckDisplayName;
    });

    const deckWins = deckGames.filter(game => game.result === "victory").length;
    const deckLosses = deckGames.filter(game => game.result === "defeat").length;
    const deckDraws = deckGames.filter(game => game.result === "draw").length;
    const deckWinRate = (deckWins / deckGames.length * 100).toFixed(2);
    
    // Calculate matchup statistics
    const matchups = {};
    deckGames.forEach(game => {
      const opponentDisplayName = getDeckDisplayName(game.opponentDeck);

      if (!matchups[opponentDisplayName]) {
        matchups[opponentDisplayName] = { total: 0, wins: 0, losses: 0, draws: 0 };
      }
      matchups[opponentDisplayName].total += 1;
      if (game.result === "victory") matchups[opponentDisplayName].wins += 1;
      if (game.result === "defeat") matchups[opponentDisplayName].losses += 1;
      if (game.result === "draw") matchups[opponentDisplayName].draws += 1;
    });
    
    // Calculate win rates for each matchup
    Object.keys(matchups).forEach(opponent => {
      matchups[opponent].winRate = (matchups[opponent].wins / matchups[opponent].total * 100).toFixed(2);
    });
    
    myDeckStats[deckDisplayName] = {
      total: deckGames.length,
      wins: deckWins,
      losses: deckLosses,
      draws: deckDraws,
      winRate: deckWinRate,
      matchups
    };
  });

  return {
    totalGames,
    wins,
    losses,
    draws,
    winRate,
    avgTurn,
    firstTurnGames,
    secondTurnGames,
    firstTurnWins,
    firstTurnLosses,
    secondTurnWins,
    secondTurnLosses,
    myDeckCounts,
    opponentDeckCounts,
    myDeckStats
  };
};

/**
 * Prepares data for pie charts, grouping items with less than 5% frequency into "Other"
 */
export const preparePieData = (countObj) => {
  const total = Object.values(countObj).reduce((sum, count) => sum + count, 0);
  const threshold = total * 0.05; // 5% threshold
  
  // Split items into main categories and others
  const mainItems = [];
  let otherCount = 0;
  
  Object.entries(countObj).forEach(([key, value]) => {
    if (value >= threshold) {
      mainItems.push({ name: key, value });
    } else {
      otherCount += value;
    }
  });
  
  // Sort by value descending
  mainItems.sort((a, b) => b.value - a.value);
  
  // Add "Other" category if there are any items below threshold
  if (otherCount > 0) {
    mainItems.push({ name: 'Other', value: otherCount });
  }
  
  return mainItems;
};

/**
 * Get significant decks (>=5% frequency) from the data
 */
const getSignificantDecks = (matchData) => {
  const deckCounts = {};
  matchData.forEach(game => {
    const deckDisplayName = getDeckDisplayName(game.opponentDeck);
    deckCounts[deckDisplayName] = (deckCounts[deckDisplayName] || 0) + 1;
  });

  const total = matchData.length;
  const threshold = total * 0.05; // 5% threshold
  
  return Object.entries(deckCounts)
    .filter(([_, count]) => count >= threshold)
    .map(([deck]) => deck)
    .sort();
};

/**
 * Calculate rolling average deck frequencies
 * @param {Array} matchData - Array of match data
 * @param {number} windowSize - Size of the rolling window (default 20)
 * @param {number} minGames - Minimum number of games required to show trends (default 50)
 */
export const calculateRollingDeckFrequencies = (matchData, windowSize = 20, minGames = 50) => {
  const significantDecks = getSignificantDecks(matchData);
  const results = [];

  // We need at least minGames matches to start showing trends
  if (matchData.length < minGames) {
    return {
      data: [],
      decks: [],
      hasEnoughGames: false
    };
  }

  // For each match index that completes a window
  for (let i = windowSize - 1; i < matchData.length; i++) {
    // Get the window of matches
    const windowMatches = matchData.slice(Math.max(0, i - windowSize + 1), i + 1);
    
    // Calculate frequencies for each significant deck in this window
    const windowCounts = {};
    significantDecks.forEach(deck => {
      windowCounts[deck] = 0;
    });

    // Count occurrences in window
    windowMatches.forEach(match => {
      const deckDisplayName = getDeckDisplayName(match.opponentDeck);
      if (significantDecks.includes(deckDisplayName)) {
        windowCounts[deckDisplayName]++;
      }
    });

    // Calculate percentages
    const dataPoint = {
      matchNumber: i + 1
    };

    significantDecks.forEach(deck => {
      dataPoint[deck] = (windowCounts[deck] / windowSize) * 100;
    });

    results.push(dataPoint);
  }

  return {
    data: results,
    decks: significantDecks,
    hasEnoughGames: true
  };
};

/**
 * Prepares data for the line chart
 */
export const prepareLineChartData = (filteredData, showAllDates) => {
  // First sort the data by timestamp from oldest to newest for chart display
  const sortedData = [...filteredData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  let points = 0;
  return sortedData.map((match, index) => {
    // Calculate points based on result
    const matchPoints = match.result === "victory" ? 10 : 
                       match.result === "defeat" ? -7 : 0;
    points += matchPoints;

    const deckDisplayName = getDeckDisplayName(match.yourDeck);

    return {
      matchNumber: index + 1,
      cumulativePoints: points,
      deck: deckDisplayName,
      result: match.result
    };
  });
};

/**
 * Loads match data from match_history.json
 */
export const loadMatchData = async (fileHandle = null) => {
  try {
    if (fileHandle) {
      // If a file handle is provided, read from it
      const file = await fileHandle.getFile();
      const contents = await file.text();
      try {
        const data = JSON.parse(contents);
        return data || [];
      } catch (e) {
        // If the file is empty or invalid JSON, return empty array
        return [];
      }
    } else {
      // Default behavior - load from src/data
      const response = await fetch('/src/data/match_history.json');
      if (!response.ok) {
        throw new Error('Failed to load match data');
      }
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error('Error loading match data:', error);
    return null;
  }
};

/**
 * Saves match data to the selected file
 */
export const saveMatchData = async (fileHandle, matchData) => {
  try {
    if (fileHandle) {
      // Save to selected file
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(matchData, null, 2));
      await writable.close();
      return true;
    } else {
      // Legacy API save
      const response = await fetch('/api/save-matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(matchData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save match data');
      }
      return true;
    }
  } catch (error) {
    console.error('Error saving match data:', error);
    return false;
  }
};