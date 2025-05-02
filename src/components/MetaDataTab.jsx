import React, { useState, useEffect } from 'react';
import tournamentMetaData from '../data/deckTournamentMeta.json';
import dayjs from 'dayjs';
import TournamentMetaAnalysis from './TournamentMetaAnalysis';

const MetaDataTab = () => {
  // State for selected date
  const [selectedDate, setSelectedDate] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [currentTournamentData, setCurrentTournamentData] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(null);

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

  // When date changes, update the tournament data
  useEffect(() => {
    if (selectedDate && tournamentMetaData[selectedDate]) {
      setCurrentTournamentData(tournamentMetaData[selectedDate]);
      setSelectedDeck(null);
    }
  }, [selectedDate]);

  // Handle date selection
  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  // Handle deck selection from the chart
  const handleDeckSelect = (deck) => {
    setSelectedDeck(deck);
  };

  // Helper function to format date for display
  const formatDate = (dateString) => {
    return dayjs(dateString).format('MMMM D, YYYY');
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

      {/* Tournament Meta Analysis Component */}
      <TournamentMetaAnalysis 
        tournamentData={currentTournamentData}
        selectedDate={selectedDate}
        onDeckSelect={handleDeckSelect}
        selectedDeck={selectedDeck}
      />
    </div>
  );
};

export default MetaDataTab;