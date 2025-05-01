import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import tournamentMetaData from '../data/deckTournamentMeta.json';
import { COLORS, OTHER_COLOR } from './DeckBarCharts';
import dayjs from 'dayjs';

const MetaDataTab = () => {
  // State for selected date
  const [selectedDate, setSelectedDate] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [currentMeta, setCurrentMeta] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [matchups, setMatchups] = useState([]);

  // When component mounts, extract available dates from the meta data
  useEffect(() => {
    const dates = Object.keys(tournamentMetaData).sort((a, b) => 
      dayjs(b).diff(dayjs(a))
    );
    setAvailableDates(dates);
    
    if (dates.length > 0) {
      setSelectedDate(dates[0]);
    }
  }, []);

  // When date changes, update the displayed meta data
  useEffect(() => {
    if (selectedDate && tournamentMetaData[selectedDate]) {
      // Get the top 20 decks for this date
      const filteredMeta = tournamentMetaData[selectedDate]
        .slice(0, 20)
        .map(deck => ({
          name: deck["Deck Name"],
          count: parseInt(deck.Count),
          share: parseFloat(deck.Share),
          winRate: parseFloat(deck["Win %"]),
          rank: parseInt(deck.Rank),
          url: deck.URL,
          deckId: deck["Deck Name"].replace(/\s+/g, '-').toLowerCase()
        }));
      
      setCurrentMeta(filteredMeta);
      setSelectedDeck(null);
      setMatchups([]);
    }
  }, [selectedDate]);

  // Handle date selection
  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  // Handle deck selection for matchup details
  const handleDeckSelect = (deck) => {
    setSelectedDeck(deck);
    
    if (selectedDate && tournamentMetaData[selectedDate]) {
      const deckData = tournamentMetaData[selectedDate].find(d => d["Deck Name"] === deck.name);
      
      if (deckData && deckData.Matchups) {
        // Transform matchup data into a format suitable for charts
        const matchupData = Object.entries(deckData.Matchups)
          .map(([opponent, data]) => ({
            opponent,
            winRate: parseFloat(data["Win Rate"]),
          }))
          .sort((a, b) => b.winRate - a.winRate);
        
        setMatchups(matchupData);
      }
    }
  };

  // Helper function to format date for display
  const formatDate = (dateString) => {
    return dayjs(dateString).format('MMMM D, YYYY');
  };

  // Custom tooltip for deck share chart
  const DeckShareTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-bold text-gray-800 mb-1">{data.name}</p>
          <p className="text-gray-600 mb-1">
            Count: {data.count} ({data.share}%)
          </p>
          <p className="text-gray-600">
            Win Rate: {data.winRate}%
          </p>
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
          <p className="text-gray-600">
            Win Rate: {data.winRate}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Tournament Meta Data</h1>
      
      {/* Date Selector */}
      <div className="mb-8">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Select Tournament Date:
        </label>
        <select
          value={selectedDate}
          onChange={handleDateChange}
          className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        >
          {availableDates.map(date => (
            <option key={date} value={date}>
              {formatDate(date)}
            </option>
          ))}
        </select>
      </div>

      {/* Top Decks Chart */}
      <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-[#2980ef] p-3">
          <h2 className="text-xl font-semibold text-white">Top Decks by Play Rate</h2>
          <p className="text-sm text-white mt-1">Click on a deck to see its matchups</p>
        </div>

        <div className="h-96 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={currentMeta}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
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
                width={110}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 12)}...` : value}
              />
              <Tooltip content={<DeckShareTooltip />} />
              <Bar dataKey="share" name="Play Rate" radius={[0, 4, 4, 0]}>
                {currentMeta.map((entry, index) => (
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

          <div className="h-96 p-4">
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
                  width={110}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 12)}...` : value}
                />
                <Tooltip content={<MatchupTooltip />} />
                <Bar dataKey="winRate" name="Win Rate" radius={[0, 4, 4, 0]}>
                  {matchups.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.winRate >= 50 ? '#34C759' : '#FF3B30'}
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
    </div>
  );
};

export default MetaDataTab;