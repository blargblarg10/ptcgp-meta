import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { COLORS, OTHER_COLOR } from './DeckBarCharts';

const TournamentMetaAnalysis = ({ 
  tournamentData, 
  selectedDate,
  onDeckSelect,
  selectedDeck
}) => {
  const [matchups, setMatchups] = useState([]);

  // Calculate dynamic height based on number of decks
  const calculateChartHeight = (items) => {
    // Allow ~30px per item, with a minimum height
    return Math.max(400, items.length * 30);
  };

  // Handle deck selection for matchup details
  const handleDeckSelect = (deck) => {
    onDeckSelect(deck);
    
    if (selectedDate && tournamentData) {
      const deckData = tournamentData.find(d => d["Deck Name"] === deck.name);
      
      if (deckData && deckData.Matchups) {
        // Transform matchup data into a format suitable for charts
        const matchupData = Object.entries(deckData.Matchups)
          .filter(([opponent, data]) => {
            // Filter out matchups with 0 games
            return data.Matches && parseInt(data.Matches) > 0;
          })
          .map(([opponent, data]) => ({
            opponent: opponent.toLowerCase() === "other" ? "OTHER" : opponent,
            winRate: parseFloat(data["Win Rate"]),
            record: data.Score || null,
            matches: parseInt(data.Matches) || 0,
            isMirrorMatch: opponent === deck.name // Add flag for mirror matches
          }))
          .sort((a, b) => b.matches - a.matches); // Sort by number of games in descending order
        
        setMatchups(matchupData);
      }
    }
  };

  // Helper function to calculate overall record
  const getOverallRecord = (deckData) => {
    if (!deckData || !deckData.Matchups) return 'N/A';
    
    let totalWins = 0;
    let totalLosses = 0;
    let totalTies = 0;
    
    // Sum up all matchup records
    Object.values(deckData.Matchups).forEach(matchup => {
      if (matchup.Score) {
        // Parse the score format which is usually "W - L - T" or "W-L"
        const scoreParts = matchup.Score.split('-').map(s => s.trim());
        
        if (scoreParts.length >= 2) {
          // Extract numbers from the score parts (handling formats like "1820 - 1820 - 84")
          const wins = parseInt(scoreParts[0].match(/\d+/)?.[0] || 0);
          const losses = parseInt(scoreParts[1].match(/\d+/)?.[0] || 0);
          
          totalWins += wins;
          totalLosses += losses;
          
          // If there's a tie component
          if (scoreParts.length > 2) {
            const ties = parseInt(scoreParts[2].match(/\d+/)?.[0] || 0);
            totalTies += ties;
          }
        }
      }
    });
    
    // Format the overall record
    return totalTies > 0 
      ? `${totalWins} - ${totalLosses} - ${totalTies}`
      : `${totalWins} - ${totalLosses}`;
  };

  // Custom tooltip for deck share chart
  const DeckShareTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      // Find the full deck data from tournament meta
      const deckData = tournamentData?.find(d => d["Deck Name"] === data.name);
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-bold text-gray-800 mb-1">{data.name}</p>
          <p className="text-gray-600 mb-1">
            Count: {data.count} ({data.share}%)
          </p>
          <p className="text-gray-600 mb-1">
            Win Rate: {data.winRate}%
          </p>
          {deckData && (
            <p className="text-gray-600">
              Record: {getOverallRecord(deckData)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for matchup chart
  const MatchupTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-bold text-gray-800 mb-1">{data.opponent}</p>
          <p className="text-gray-600 mb-1">
            Win Rate: {data.winRate}%
          </p>
          {data.record && (
            <p className="text-gray-600">
              Record: {data.record}
            </p>
          )}
          <p className="text-gray-600">
            Games: {data.matches}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {/* Top Decks Chart */}
      <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-[#2980ef] p-3">
          <h2 className="text-xl font-semibold text-white">Top Decks by Play Rate</h2>
          <p className="text-sm text-white mt-1">Click on a deck to see its matchups</p>
        </div>

        <div className="p-4" style={{ height: calculateChartHeight(tournamentData?.slice(0, 20).map(deck => ({
          name: deck["Deck Name"],
          count: parseInt(deck.Count),
          share: parseFloat(deck.Share),
          winRate: parseFloat(deck["Win %"]),
          rank: parseInt(deck.Rank),
          url: deck.URL,
          deckId: deck["Deck Name"].replace(/\s+/g, '-').toLowerCase()
        })) || []) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={tournamentData?.slice(0, 20).map(deck => ({
                name: deck["Deck Name"],
                count: parseInt(deck.Count),
                share: parseFloat(deck.Share),
                winRate: parseFloat(deck["Win %"]),
                rank: parseInt(deck.Rank),
                url: deck.URL,
                deckId: deck["Deck Name"].replace(/\s+/g, '-').toLowerCase()
              }))}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
              onClick={(data) => {
                if (data && data.activePayload && data.activePayload.length > 0) {
                  handleDeckSelect(data.activePayload[0].payload);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" label={{ value: 'Play Rate (%)', position: 'insideBottom', offset: -5 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontSize: 12 }}
                tickFormatter={(value, index) => {
                  const decks = tournamentData?.slice(0, 20).map(deck => ({
                    name: deck["Deck Name"],
                    share: parseFloat(deck.Share)
                  })) || [];
                  if (index < decks.length) {
                    const deck = decks[index];
                    const displayName = value.length > 15 ? `${value.substring(0, 12)}...` : value;
                    return `${displayName} (${deck.share}%)`;
                  }
                  return value;
                }}
                interval={0} // This ensures all ticks are shown
              />
              <Tooltip content={<DeckShareTooltip />} />
              <Bar dataKey="share" name="Play Rate" radius={[0, 4, 4, 0]}>
                {(tournamentData?.slice(0, 20).map(deck => ({
                  name: deck["Deck Name"],
                  share: parseFloat(deck.Share)
                })) || []).map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    cursor="pointer"
                    fill={selectedDeck && selectedDeck.name === entry.name ? '#FF3B30' : COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Matchup Analysis */}
      {selectedDeck && (
        <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-[#2980ef] p-3">
            <h2 className="text-xl font-semibold text-white">
              Matchup Analysis: {selectedDeck.name}
            </h2>
            <p className="text-sm text-white mt-1">
              Win Rate: {selectedDeck.winRate}% | Play Rate: {selectedDeck.share}% | Rank: #{selectedDeck.rank}
            </p>
          </div>

          <div className="p-4" style={{ height: calculateChartHeight(matchups.slice(0, 20)) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={matchups.slice(0, 20)} // Show top 20 matchups
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  label={{ value: 'Win Rate (%)', position: 'insideBottom', offset: -5 }}
                  domain={[0, 100]}
                  ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                />
                <YAxis
                  type="category"
                  dataKey="opponent"
                  width={140}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value, index) => {
                    const matchup = matchups.slice(0, 20)[index];
                    const displayName = value.length > 12 ? `${value.substring(0, 10)}...` : value;
                    return `${displayName} (${matchup.winRate}%)`;
                  }}
                  interval={0} // This ensures all ticks are shown
                />
                <Tooltip content={<MatchupTooltip />} />
                <Bar dataKey="winRate" name="Win Rate" radius={[0, 4, 4, 0]}>
                  {matchups.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isMirrorMatch ? '#808080' : entry.winRate >= 50 ? '#34C759' : '#FF3B30'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {selectedDeck.url && (
            <div className="p-4 border-t border-gray-200">
              <a 
                href={selectedDeck.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                View Deck on Limitless TCG
              </a>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default TournamentMetaAnalysis;