import React from 'react';

/**
 * Component for displaying a loading spinner
 */
const LoadingIndicator = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(107, 114, 128, 0.25)' }}>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );
};

export default LoadingIndicator;
