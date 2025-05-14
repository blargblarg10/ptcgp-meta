import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { calculateStats, preparePieData, prepareLineChartData, calculateRollingDeckFrequencies } from '../utils/matchStatsCalculator';
import { useAuth } from '../../auth/context/AuthContext';
import { loadUserMatchData } from '../../../services/firebase';
import PieCharts from './charts/PieCharts';
import { COLORS, OTHER_COLOR } from './charts/PieCharts';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import dayjs from 'dayjs';
import seasonsData from '../../../config/seasons.json';

// Get the latest season by comparing start dates
const getLatestSeason = () => {
  return seasonsData.seasons.reduce((latest, current) => {
    if (!latest) return current;
    return dayjs(current.startDate).isAfter(dayjs(latest.startDate)) ? current : latest;
  }, null);
};

const YourStats = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // State
  const { currentUser, userData } = useAuth();
  const [fullData, setFullData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [dateRange, setDateRange] = useState([today, today]);
  const [filterType, setFilterType] = useState('season'); // 'all', 'range', or 'season'
  const [selectedSeason, setSelectedSeason] = useState(getLatestSeason()?.id);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalGames: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
    myDeckCounts: {},
    opponentDeckCounts: {},
    myDeckStats: {}
  });
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  const [isDesktop, setIsDesktop] = useState(false);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setIsDesktop(window.innerWidth >= 768);
    };
    
    // Set initial value
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load match data on component mount or when userData changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (userData) {
          const data = await loadUserMatchData(userData);
          if (data && data.length > 0) {
            setFullData(data);
            setFilteredData(data);
          } else {
            setFullData([]);
            setFilteredData([]);
          }
        } else {
          setFullData([]);
          setFilteredData([]);
        }
      } catch (error) {
        console.error('Error loading match data:', error);
        setFullData([]);
        setFilteredData([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userData]);

  // Filter data based on selected date range or season
  useEffect(() => {
    if (filterType === 'all') {
      setFilteredData(fullData);
      return;
    }

    if (filterType === 'range' && dateRange[0] && dateRange[1]) {
      const startDate = dayjs(dateRange[0]).startOf('day');
      const endDate = dayjs(dateRange[1]).endOf('day');
      
      const filtered = fullData.filter(game => {
        const gameDate = dayjs(game.timestamp);
        return gameDate.isAfter(startDate) && gameDate.isBefore(endDate);
      });
      
      setFilteredData(filtered);
      return;
    }

    if (filterType === 'season' && selectedSeason) {
      const season = seasonsData.seasons.find(s => s.id === selectedSeason);
      if (season) {
        const startDate = dayjs(season.startDate);
        const endDate = dayjs(season.endDate);
        const name = season.name;
        
        const filtered = fullData.filter(game => {
          const gameDate = dayjs(game.timestamp);
          return gameDate.isAfter(startDate) && gameDate.isBefore(endDate);
        });
        
        setFilteredData(filtered);
      }
    }
  }, [filterType, dateRange, selectedSeason, fullData]);

  // Calculate statistics whenever filtered data changes
  useEffect(() => {
    setStats(calculateStats(filteredData));
  }, [filteredData]);

  // Handle filter type change
  const handleFilterTypeChange = (type) => {
    setFilterType(type);
    if (type === 'all') {
      // Instead of setting to null, reset to today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setDateRange([today, today]);
      setSelectedSeason(null);
    }
    if (type === 'season') {
      setDateRange([null, null]);
      setSelectedSeason(getLatestSeason()?.id);
    }
  };

  // Handle date range change
  const handleDateRangeChange = (update) => {
    setDateRange(update);
  };

  // Handle season change
  const handleSeasonChange = (event) => {
    setSelectedSeason(event.target.value);
  };

  // Prepare chart data
  const myDeckPieData = preparePieData(stats.myDeckCounts);
  const opponentDeckPieData = preparePieData(stats.opponentDeckCounts);
  const pointsChartData = prepareLineChartData(filteredData);
  const rollingFrequencyData = calculateRollingDeckFrequencies(filteredData);

  // Get current season info for display
  const getCurrentSeasonInfo = () => {
    if (!selectedSeason) return null;
    const season = seasonsData.seasons.find(s => s.id === selectedSeason);
    if (!season) return null;

    // Validate season dates
    try {
      const startDate = dayjs(season.startDate);
      const endDate = dayjs(season.endDate);
      
      if (!startDate.isValid() || !endDate.isValid() || startDate.isAfter(endDate)) {
        return { ...season, hasDateError: true };
      }
      
      // Calculate days remaining in the season
      const now = dayjs();
      const daysRemaining = endDate.diff(now, 'day');
      
      return { 
        ...season, 
        startDateFormatted: startDate.format('MMM D, YYYY'),
        endDateFormatted: endDate.format('MMM D, YYYY'),
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        hasTimeLeft: daysRemaining > 0
      };
    } catch (error) {
      return { ...season, hasDateError: true };
    }
  };

  // If not logged in, prompt user to sign in
  if (!currentUser) {
    return (
      <div className="max-w-[1400px] mx-auto p-4">
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <h2 className="text-xl font-semibold text-blue-800 mb-3">Sign in to View Your Stats</h2>
          <p className="text-blue-600 mb-4">
            Please sign in to view your match statistics. Your data is securely stored in your account.
          </p>
        </div>
      </div>
    );
  }

  // If loading, show spinner
  if (loading) {
    return (
      <div className="flex justify-center my-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If no data, show message
  if (fullData.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto p-4">
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <h2 className="text-xl font-semibold text-yellow-800 mb-3">No Match Data</h2>
          <p className="text-yellow-700 mb-4">
            You haven't recorded any matches yet. Go to the "Submit Your Data" tab to start tracking your matches.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">      <style>
        {`
          @media (min-width: 640px) {
            .thin-scrollbar::-webkit-scrollbar {
              width: 4px;
            }
            
            .thin-scrollbar::-webkit-scrollbar-track {
              background: #e5e7eb;
              border-radius: 8px;
            }
            
            .thin-scrollbar::-webkit-scrollbar-thumb {
              background: #313131;
              border-radius: 8px;
            }
            
            .thin-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #313131;
            }
              /* Hide scrollbar when not hovering */
            .thin-scrollbar {
              scrollbar-width: thin;
            }
            
            .thin-scrollbar::-webkit-scrollbar {
              width: 4px;
            }
            
            /* Make sure scrollbar is actually visible */
            .thin-scrollbar:hover::-webkit-scrollbar,
            .thin-scrollbar:focus::-webkit-scrollbar,
            .thin-scrollbar:active::-webkit-scrollbar {
              display: block;
            }
          }
        `}
      </style>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-4 text-gray-800">Match History Dashboard</h1>
        
        {/* Date Filter Controls */}
        <div className="flex flex-col items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-center space-x-6 mb-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="season"
                checked={filterType === 'season'}
                onChange={(e) => handleFilterTypeChange(e.target.value)}
                className="h-4 w-4 text-[#2980ef] focus:ring-[#2980ef] border-gray-300"
              />
              <span className="text-gray-700 font-medium">Season Range</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="all"
                checked={filterType === 'all'}
                onChange={(e) => handleFilterTypeChange(e.target.value)}
                className="h-4 w-4 text-[#2980ef] focus:ring-[#2980ef] border-gray-300"
              />
              <span className="text-gray-700 font-medium">All Dates</span>
            </label>
            
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="range"
                checked={filterType === 'range'}
                onChange={(e) => handleFilterTypeChange(e.target.value)}
                className="h-4 w-4 text-[#2980ef] focus:ring-[#2980ef] border-gray-300"
              />
              <span className="text-gray-700 font-medium">Date Range</span>
            </label>
          </div>
          
          {filterType === 'range' && (
            <div className="w-full max-w-md flex justify-center space-x-4">
              <DatePicker
                selected={dateRange[0]}
                onChange={(date) => handleDateRangeChange([date, dateRange[1]])}
                selectsStart
                startDate={dateRange[0]}
                endDate={dateRange[1]}
                placeholderText="Start Date"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
              />
              <DatePicker
                selected={dateRange[1]}
                onChange={(date) => handleDateRangeChange([dateRange[0], date])}
                selectsEnd
                startDate={dateRange[0]}
                endDate={dateRange[1]}
                minDate={dateRange[0]}
                placeholderText="End Date"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
              />
            </div>
          )}

          {filterType === 'season' && (
            <div className="w-full max-w-md">
              <select
                value={selectedSeason || ''}
                onChange={handleSeasonChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
              >
                <option value="" disabled>Select a Season</option>
                {seasonsData.seasons.map(season => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <p className="text-gray-500 text-center mt-3">
            {filterType === 'all' && "Showing all matches"}
            {filterType === 'range' && dateRange[0] && dateRange[1] && 
              `Showing matches from ${dateRange[0].toLocaleDateString()} to ${dateRange[1].toLocaleDateString()}`
            }
            {filterType === 'range' && (!dateRange[0] || !dateRange[1]) && 
              "Select a date range to filter matches"
            }
            {filterType === 'season' && 
              (getCurrentSeasonInfo() 
                ? (getCurrentSeasonInfo().hasDateError 
                    ? "Error with Season Date Range" 
                    : `Showing matches from season ${getCurrentSeasonInfo().name} | ${getCurrentSeasonInfo().startDateFormatted} - ${getCurrentSeasonInfo().endDateFormatted}${
                        getCurrentSeasonInfo().hasTimeLeft 
                        ? ` | Days remaining: ${getCurrentSeasonInfo().daysRemaining}` 
                        : ''
                      }`)
                : "Select a season")
            }
          </p>
        </div>

        {/* Overall Statistics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="bg-[#2980ef] p-3">
            <h2 className="text-2xl font-semibold text-white">Overall Statistics</h2>
          </div>
          
          {/* Stats Row - Responsive grid for mobile */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${stats.avgTurn ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-2 sm:gap-3 md:gap-4 p-4`}>
            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 text-center">
              <p className="text-gray-600 font-medium mb-1 text-sm sm:text-base">Total Games</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-800">{stats.totalGames}</p>
            </div>
            
            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 text-center">
              <p className="text-gray-600 font-medium mb-1 text-sm sm:text-base">Record</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-800">
              {stats.wins}-{stats.losses}-{stats.draws} <span className="text-base font-medium text-gray-600">({stats.winRate}%)</span>
              </p>
            </div>
            
            {stats.avgTurn && (
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 text-center">
                <p className="text-gray-600 font-medium mb-1 text-sm sm:text-base">Avg. Turn</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-800">
                  {stats.avgTurn}
                </p>
              </div>
            )}
            
            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 text-center">
              <p className="text-gray-600 font-medium mb-1 text-sm sm:text-base">Points</p>
              <p className={`text-xl sm:text-2xl font-bold ${(pointsChartData[pointsChartData.length - 1]?.cumulativePoints || 0) < 0 ? 'text-red-600' : 'text-gray-800'}`}>
              {pointsChartData[pointsChartData.length - 1]?.cumulativePoints || 0}
              </p>
            </div>
          </div>

          {/* Turn Order Performance */}
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 mb-4 mx-4">
            <p className="text-gray-600 font-medium mb-2 text-sm sm:text-base text-center">Turn Order Performance</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-none md:flex md:flex-row md:justify-between gap-3">
              <div 
                className="bg-blue-50 p-3 rounded-lg shadow-sm border border-blue-100 text-center w-full sm:w-full md:w-auto"
                style={{
                  width: isDesktop 
                    ? `calc(100% * ${stats.firstTurnGames ? Math.max((stats.firstTurnGames / stats.totalGames), 0.1) : 0.5})` 
                    : '100%',
                  minWidth: '150px',
                  transition: 'width 0.5s ease-in-out'
                }}
              >
                <p className="text-blue-700 font-medium mb-1 text-sm">Going First</p>
                <p className="text-lg font-bold text-blue-800">
                  {stats.firstTurnGames ? 
                    `${stats.firstTurnWins}-${stats.firstTurnLosses} (${((stats.firstTurnWins / stats.firstTurnGames) * 100).toFixed(1)}%)` : 
                    'No data'}
                </p>
                <p className="text-xs text-blue-600 mt-1">{stats.firstTurnGames || 0} games ({stats.firstTurnGames ? ((stats.firstTurnGames / stats.totalGames) * 100).toFixed(1) : 0}%)</p>
              </div>
              
              <div 
                className="bg-red-50 p-3 rounded-lg shadow-sm border border-red-100 text-center w-full sm:w-full md:w-auto"
                style={{
                  width: isDesktop 
                    ? `calc(100% * ${stats.secondTurnGames ? Math.max((stats.secondTurnGames / stats.totalGames), 0.1) : 0.5})` 
                    : '100%',
                  minWidth: '150px',
                  transition: 'width 0.5s ease-in-out'
                }}
              >
                <p className="text-red-700 font-medium mb-1 text-sm">Going Second</p>
                <p className="text-lg font-bold text-red-800">
                  {stats.secondTurnGames ? 
                    `${stats.secondTurnWins}-${stats.secondTurnLosses} (${((stats.secondTurnWins / stats.secondTurnGames) * 100).toFixed(1)}%)` : 
                    'No data'}
                </p>
                <p className="text-xs text-red-600 mt-1">{stats.secondTurnGames || 0} games ({stats.secondTurnGames ? ((stats.secondTurnGames / stats.totalGames) * 100).toFixed(1) : 0}%)</p>
              </div>
            </div>
          </div>

          {/* Bar Charts Section */}
          <div className="mb-6">
            <PieCharts 
              myDeckPieData={myDeckPieData}
              opponentDeckPieData={opponentDeckPieData}
              totalGames={stats.totalGames}
            />
          </div>
        </div>
        
        {/* Rolling Deck Frequency Chart */}
        {rollingFrequencyData.hasEnoughGames ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="bg-[#2980ef] p-3">
              <h2 className="text-2xl font-semibold text-white">Deck Usage Trends</h2>
              <p className="text-sm text-white mt-1">20-game rolling average of deck frequency</p>
            </div>
            <div className="h-80 px-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={rollingFrequencyData.data}
                  margin={{ top: 15, right: 40, left: 0, bottom: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="matchNumber"
                    label={{ value: 'Match Number', position: 'insideBottomRight', offset: -10, fill: '#6b7280' }}
                    stroke="#6b7280"
                    interval={0}
                    tickFormatter={(value) => value % 10 === 0 ? value : ''}
                    ticks={rollingFrequencyData.data
                      .map(d => d.matchNumber)
                      .filter(num => num % 10 === 0)}
                  />
                  <YAxis 
                    label={{ value: 'Frequency (%)', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderColor: '#e5e7eb' }}
                    formatter={(value, name) => [`${value.toFixed(1)}%`, name]}
                    labelFormatter={(label) => `Match #${label}`}
                  />
                  <Legend />
                  {rollingFrequencyData.decks.map((deck, index) => (
                    <Line
                      key={deck}
                      type="monotone"
                      dataKey={deck}
                      name={deck}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : stats.totalGames >= 20 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-6 p-6 text-center">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Deck Usage Trends</h2>
            <p className="text-gray-600">
              Play more games to see deck usage trends! <br/>
              {50 - stats.totalGames} more games needed.
            </p>
          </div>
        ) : null}

        {/* Points Over Time Line Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="bg-[#2980ef] p-3">
          <h2 className="text-2xl font-semibold text-white">Point Progression</h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={pointsChartData}
                margin={{ top: 15, right: 20, left: 0, bottom: 15 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="matchNumber" 
                  label={{ value: 'Match Number', position: 'insideBottomRight', offset: -10, fill: '#6b7280' }}
                  stroke="#6b7280"
                />
                <YAxis 
                  label={{ value: 'Cumulative Points', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                  stroke="#6b7280"
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderColor: '#e5e7eb' }}
                  itemStyle={{ color: '#374151' }}
                  formatter={(value, name, props) => {
                    if (name === 'cumulativePoints') {
                      return [`${value} points`, 'Total Points'];
                    }
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Match #${label}`}
                />
                <ReferenceLine y={0} stroke="#d1d5db" />
                <Line 
                  type="monotone" 
                  dataKey="cumulativePoints" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#313131', strokeWidth: 0, r: 3 }}
                  activeDot={{ fill: '#c4b5fd', stroke: '#313131', strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Divider */}
        <div className="border-b border-gray-200 mb-8"></div>
        
        {/* Individual Deck Statistics */}
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Individual Deck Statistics</h2>
        <div className="flex flex-wrap">
          {Object.keys(stats.myDeckStats).map((deckType) => {
            const deckStat = stats.myDeckStats[deckType];
            return (
              <div key={deckType} className="w-full md:w-1/2 lg:w-1/3 p-2" style={{ alignSelf: 'flex-start' }}>                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden h-[350px] flex flex-col">
                  <div className="bg-gray-200 p-2">
                    <h3 className="text-lg font-bold text-gray-800">{deckType}</h3>
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="text-center p-1 bg-gray-50 rounded shadow-sm border border-gray-100">
                        <p className="text-gray-600 text-xs">Games / Record</p>
                        <p className="text-base font-bold text-gray-800">
                          {deckStat.total} <span className="text-xs font-normal">({deckStat.wins}-{deckStat.losses}-{deckStat.draws})</span>
                        </p>
                      </div>
                      <div className="text-center p-1 bg-gray-50 rounded shadow-sm border border-gray-100">
                        <p className="text-gray-600 text-xs">Win Rate</p>
                        <p className="text-base font-bold text-gray-800">{deckStat.winRate}%</p>
                      </div>
                    </div>
                      <h4 className="font-semibold text-gray-800 text-sm mb-1">Matchups:</h4>
                    <div className="overflow-y-auto max-h-[180px] thin-scrollbar pr-2 mt-1">
                      <div className="space-y-1">
                        {Object.entries(deckStat.matchups)
                          .sort(([_, a], [__, b]) => b.total - a.total) // Sort by total games played
                          .map(([opponent, matchup]) => (
                            <div key={opponent} className="flex justify-between items-center p-1 bg-gray-50 rounded shadow-sm border border-gray-100 text-xs">
                              <div className="font-medium text-gray-700 truncate mr-1 flex-1">
                                {opponent}
                              </div>
                              <div className="font-semibold text-gray-800 whitespace-nowrap">
                                {`${matchup.wins}-${matchup.losses}${matchup.draws > 0 ? `-${matchup.draws}` : ''}`}
                                <span className="text-gray-600 ml-1">({matchup.winRate}%)</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default YourStats;