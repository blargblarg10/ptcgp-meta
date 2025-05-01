import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-bold text-gray-800 mb-1">{data.name}</p>
        <p className="text-gray-600">
          Games: {data.value} ({((data.value / data.total) * 100).toFixed(1)}%)
        </p>
      </div>
    );
  }
  return null;
};

const CustomBarLabel = ({ x, y, width, value, total }) => {
  const percentage = ((value / total) * 100).toFixed(1);
  return (
    <text
      x={x + width + 5}  // Reduced padding after bar
      y={y + 15}         // Adjusted vertical position to center with bar
      fill="#374151"
      fontSize={12}
      textAnchor="start"
      alignmentBaseline="middle"  // Changed to alignmentBaseline for better vertical alignment
      className="font-medium"
    >
      {`${value} (${percentage}%)`}
    </text>
  );
};

// New reusable single chart component
const SingleDeckChart = ({ data, title, totalGames }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-xl font-semibold mb-6 text-gray-800 border-b border-gray-200 pb-2">
        {title}
      </h3>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <XAxis type="number" />
            <YAxis 
              type="category" 
              dataKey="displayName" 
              width={190}
              interval={0}
              tick={{ 
                fill: '#374151',
                fontSize: 12,
                fontWeight: 500,
                transform: 'translate(-5, 0)'
              }}
              tickFormatter={(value) => {
                return value.length > 30 ? `${value.substring(0, 27)}...` : value;
              }}
            />
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
            />
            <Bar 
              dataKey="value" 
              fill="#8884d8"
              minPointSize={2}
              label={<CustomBarLabel total={totalGames} />}
              radius={[4, 4, 4, 4]}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.name === 'Other' ? OTHER_COLOR : COLORS[index % COLORS.length]}
                  style={{ filter: 'drop-shadow(0px 2px 2px rgba(0, 0, 0, 0.1))' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const DeckBarCharts = ({ myDeckPieData, opponentDeckPieData, totalGames }) => {
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
    <div className="grid grid-cols-1 gap-8 p-4">
      <SingleDeckChart 
        data={myDeckData} 
        title="My Deck Distribution" 
        totalGames={totalGames} 
      />
      <SingleDeckChart 
        data={opponentDeckData} 
        title="Opponent Deck Distribution" 
        totalGames={totalGames} 
      />
    </div>
  );
};

export default DeckBarCharts;
export { COLORS, OTHER_COLOR };