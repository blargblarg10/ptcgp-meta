// User match data service for Firebase
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './config';

/**
 * Recursively converts string "null" values to JavaScript null
 * @param {Object|Array} data - Data to process
 * @returns {Object|Array} Processed data with string "null" replaced with null
 */
const convertStringNullToNull = (data) => {
  if (data === null || data === undefined) return data;
  
  if (data === "null") return null;
  
  if (typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(item => convertStringNullToNull(item));
  }
  
  const result = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      result[key] = convertStringNullToNull(data[key]);
    }
  }
  return result;
};

// Load user match data
export const loadUserMatchData = async (userData) => {
  if (!userData || !userData.user_id) {
    console.error("No valid user data available");
    return [];
  }
  
  try {
    // Reference to the user document in Firestore
    const userDocRef = doc(db, 'users', userData.user_id);
    
    // Get the document
    const docSnap = await getDoc(userDocRef);
    
    if (!docSnap.exists()) {
      console.error("User document does not exist");
      return [];
    }
    
    // Get the userData object
    const userDocData = docSnap.data();
    
    // Return matches if they exist
    if (userDocData.matches) {
      return userDocData.matches;
    }
    
    // Initialize empty matches array in Firestore
    await updateDoc(userDocRef, {
      matches: [],
      stats: {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0
      },
      lastUpdated: new Date().toISOString()
    });
    
    return [];
  } catch (error) {
    console.error("Error loading user match data:", error);
    return [];
  }
};

// Save user match data
export const saveUserMatchData = async (userData, matchData) => {
  if (!userData || !userData.user_id) {
    console.error("No user data available");
    return false;
  }
  
  try {
    // Convert string "null" values to actual null
    const processedMatchData = convertStringNullToNull(matchData);
    
    // Ensure all match entries have points and auto fields
    const updatedMatchData = processedMatchData.map(match => ({
      ...match,
      // Ensure points exists, default to 0 if missing
      points: match.points !== undefined ? match.points : 0,
      // Ensure auto exists, default to true if missing
      auto: match.auto !== undefined ? match.auto : true
    }));
    
    // Sort matches by timestamp from newest to oldest
    const sortedMatchData = [...updatedMatchData].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Calculate stats
    const stats = {
      totalMatches: sortedMatchData.length,
      wins: sortedMatchData.filter(game => game.result === "victory").length,
      losses: sortedMatchData.filter(game => game.result === "defeat").length,
      draws: sortedMatchData.filter(game => game.result === "draw").length
    };
    
    // Update the Firestore document with matches
    const userDocRef = doc(db, 'users', userData.user_id);
    await updateDoc(userDocRef, {
      matches: sortedMatchData,
      stats: stats,
      lastUpdated: new Date().toISOString()
    });
    
    console.log(`Saved match data for user ${userData.user_id}`);
    return true;
  } catch (error) {
    console.error("Error saving user match data:", error);
    return false;
  }
};
