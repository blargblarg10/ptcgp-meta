// Firebase services index file
// Re-export all Firebase service functions

// Config and initialized services
export { auth, db } from './config';

// Authentication
export { 
  signInWithGoogle,
  logOut,
  subscribeToAuthChanges,
  createOrGetUserDocument
} from './auth';

// User match data
export {
  loadUserMatchData,
  saveUserMatchData
} from './matches';
