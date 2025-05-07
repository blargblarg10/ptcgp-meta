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

// New reusable single chart component
const SingleDeckPieChart = ({ data, title, totalGames }) => {
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
      <h3 className="text-xl font-semibold mb-6 text-gray-800 border-b border-gray-200 pb-2">
        {title}
      </h3>
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
  const processData = (data) => {
    return data.map(item => ({
      ...item,
      total: totalGames,
      displayName: item.name.length > 35 ? `${item.name.substring(0, 32)}...` : item.name
    }));
  };

  const myDeckData = processData(myDeckPieData);
  const opponentDeckData = processData(opponentDeckPieData);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
      <SingleDeckPieChart 
        data={myDeckData} 
        title="My Deck Distribution" 
        totalGames={totalGames} 
      />
      <SingleDeckPieChart 
        data={opponentDeckData} 
        title="Opponent Deck Distribution" 
        totalGames={totalGames} 
      />
    </div>
  );
};

export default PieCharts;
export { COLORS, OTHER_COLOR };