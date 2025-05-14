// Helper function to create new user data
const createNewUserData = (user) => {
  return {
    user_id: user.uid,
    name: user.displayName || 'Anonymous User',
    email: user.email || null,
    photoURL: user.photoURL || null,
    createdAt: new Date().toISOString(),
    matches: [],
    stats: {
      totalMatches: 0,
      wins: 0,
      losses: 0,
      draws: 0
    },
    lastUpdated: new Date().toISOString()
  };
};
