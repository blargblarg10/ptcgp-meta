import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Sector } from 'recharts';

// Modern Pokémon-themed colors
const COLORS = [
  '#FF3B30', // Fire Red
  '#5856D6', // Psychic Purple
  '#34C759', // Grass Green
  '#007AFF', // Water Blue
  '#FFCC00', // Electric Yellow
  '#AF52DE', // Ghost Purple
  '#FF9500', // Fighting Orange
  '#5856D6', // Dragon Blue
  '#FF2D55', // Fairy Pink
  '#FF3B30'  // Ground Red
];

const OTHER_COLOR = '#8E8E93'; // Modern gray for "Other" category

// Add a style tag to remove outlines from SVG elements
const NoOutlineStyle = () => (
  <style>
    {`
      .recharts-sector {
        outline: none !important;
      }
      .recharts-pie-sector:focus {
        outline: none !important;
      }
      .recharts-surface:focus {
        outline: none !important;
      }
      .recharts-wrapper * {
        outline: none !important;
      }
      svg *:focus, svg *:focus-visible {
        outline: none !important;
      }
      /* Target all possible svg elements that might get the focus outline */
      svg path, svg circle, svg ellipse, svg line, svg polyline, 
      svg polygon, svg rect, svg text, svg g {
        outline: none !important;
      }
    `}
  </style>
);

// Active shape for animation when hovering over pie slices
const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="drop-shadow-md"
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 15}
        fill={fill}
      />
      <text x={cx} y={cy - 5} textAnchor="middle" fill="#333" className="font-medium">
        {payload.name}
      </text>
      <text x={cx} y={cy + 20} textAnchor="middle" fill="#666">
        {`${value} (${(percent * 100).toFixed(1)}%)`}
      </text>
    </g>
  );
};

// Custom Legend
const CustomLegend = ({ payload }) => {
  return (
    <ul className="flex flex-wrap justify-center gap-2 mt-4">
      {payload.map((entry, index) => (
        <li key={`legend-${index}`} className="flex items-center gap-1 text-sm px-2 py-1 rounded-full bg-gray-50">
          <div
            style={{ backgroundColor: entry.color }}
            className="w-3 h-3 rounded-full"
          />
          <span className="text-gray-700">
            {entry.value.length > 20 ? `${entry.value.substring(0, 17)}...` : entry.value}
          </span>
        </li>
      ))}
    </ul>
  );
};

// View mode toggle component
const ViewModeToggle = ({ viewMode, setViewMode }) => {
  return (
    <div className="flex items-center">
      <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
        <button
          className={`px-2 py-1 flex items-center ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setViewMode('list')}
          title="List View"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          className={`px-2 py-1 flex items-center ${viewMode === 'pie' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setViewMode('pie')}
          title="Pie Chart View"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
            <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// List view component
const DeckListView = ({ data, title, viewMode, setViewMode }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-2">
        <h3 className="text-xl font-semibold text-gray-800">
          {title}
        </h3>
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deck
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Count
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Percentage
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={`${item.name}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-2 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: item.name === 'Other' ? OTHER_COLOR : COLORS[index % COLORS.length] }}></div>
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                  </div>
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-right text-sm text-gray-500">
                  {item.value}
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-right text-sm text-gray-500">
                  {((item.value / item.total) * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// New reusable single chart component
const SingleDeckPieChart = ({ data, title, totalGames, viewMode, setViewMode }) => {
  // Track both hover index and clicked index separately
  const [hoverIndex, setHoverIndex] = useState(null);
  const [clickedIndex, setClickedIndex] = useState(null);
  
  // The active index is either the hover index (if hovering) or the clicked index (if clicked)
  const activeIndex = hoverIndex !== null ? hoverIndex : clickedIndex;

  // Add an effect to apply the no-outline style to the document
  useEffect(() => {
    // Add a global style to the document head
    const style = document.createElement('style');
    style.textContent = `
      .recharts-sector, .recharts-sector:focus, .recharts-sector:focus-visible,
      .recharts-surface, .recharts-surface:focus, .recharts-surface:focus-visible,
      svg *, svg *:focus, svg *:focus-visible {
        outline: none !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);
    
    // Cleanup function to remove the style when component unmounts
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const onPieEnter = (_, index) => {
    setHoverIndex(index);
  };

  const onPieLeave = () => {
    // When mouse leaves, clear the hover index
    setHoverIndex(null);
  };

  const onPieClick = (_, index) => {
    // If clicking on the already clicked slice, unselect it
    if (clickedIndex === index) {
      setClickedIndex(null);
    } else {
      // Otherwise, select the new slice
      setClickedIndex(index);
    }
  };

  // Add click handler to document to clear activeIndex when clicking outside the chart
  useEffect(() => {
    const handleDocumentClick = (e) => {
      // Check if the click is outside the pie chart
      const pieElements = document.querySelectorAll('.recharts-sector');
      let clickedOnPie = false;
      
      for (const el of pieElements) {
        if (el.contains(e.target) || el === e.target) {
          clickedOnPie = true;
          break;
        }
      }
      
      if (!clickedOnPie) {
        setClickedIndex(null);
      }
    };

    document.addEventListener('click', handleDocumentClick);
    
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-2">
        <h3 className="text-xl font-semibold text-gray-800">
          {title}
        </h3>
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <NoOutlineStyle />
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="40%"
              outerRadius="70%"
              dataKey="value"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              onClick={onPieClick}
              paddingAngle={2}
              style={{ outline: 'none' }}
              tabIndex={-1} // Prevent keyboard focus
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.name === 'Other' ? OTHER_COLOR : COLORS[index % COLORS.length]}
                  className="drop-shadow-sm"
                  style={{ outline: 'none', cursor: 'pointer' }}
                />
              ))}
            </Pie>
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const PieCharts = ({ myDeckPieData, opponentDeckPieData, totalGames }) => {
  // Independent view modes for each chart
  const [myDeckViewMode, setMyDeckViewMode] = useState('list');
  const [opponentDeckViewMode, setOpponentDeckViewMode] = useState('list');
  
  const processData = (data) => {
    return data.map(item => ({
      ...item,
      total: totalGames,
      displayName: item.name.length > 35 ? `${item.name.substring(0, 32)}...` : item.name
    }));
  };

  const myDeckData = processData(myDeckPieData);
  const opponentDeckData = processData(opponentDeckPieData);

  // Render function for My Deck tile
  const renderMyDeckTile = () => {
    if (myDeckViewMode === 'pie') {
      return (
        <SingleDeckPieChart 
          data={myDeckData} 
          title="My Deck Distribution" 
          totalGames={totalGames} 
          viewMode={myDeckViewMode}
          setViewMode={setMyDeckViewMode}
        />
      );
    } else {
      return (
        <DeckListView 
          data={myDeckData} 
          title="My Deck Distribution" 
          viewMode={myDeckViewMode}
          setViewMode={setMyDeckViewMode}
        />
      );
    }
  };

  // Render function for Opponent Deck tile
  const renderOpponentDeckTile = () => {
    if (opponentDeckViewMode === 'pie') {
      return (
        <SingleDeckPieChart 
          data={opponentDeckData} 
          title="Opponent Deck Distribution" 
          totalGames={totalGames} 
          viewMode={opponentDeckViewMode}
          setViewMode={setOpponentDeckViewMode}
        />
      );
    } else {
      return (
        <DeckListView 
          data={opponentDeckData} 
          title="Opponent Deck Distribution" 
          viewMode={opponentDeckViewMode}
          setViewMode={setOpponentDeckViewMode}
        />
      );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {renderMyDeckTile()}
      {renderOpponentDeckTile()}
    </div>
  );
};

export default PieCharts;
export { COLORS, OTHER_COLOR };