import React from 'react';

/**
 * Component for displaying error messages
 */
const ErrorDialog = ({ error, onClose }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(107, 114, 128, 0.25)' }}>
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 className="text-lg font-medium text-red-600 mb-2">Upload Error</h3>
        <div className="text-gray-600 mb-4">
          <p className="mb-2">{error.split(' - ')[0]}</p>
          {error.includes(' - Field:') && (
            <div className="mt-2 bg-red-50 p-3 rounded border border-red-200">
              <p className="font-medium text-red-700 text-sm">Error Details:</p>
              <div className="mt-1 grid grid-cols-3 gap-1 text-sm">
                <div className="font-medium">Field:</div>
                <div className="col-span-2">{error.split('Field: ')[1]?.split(',')[0]}</div>
                
                <div className="font-medium">Value:</div>
                <div className="col-span-2 font-mono text-red-800 break-all">
                  {error.split('Value: ')[1]}
                </div>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ErrorDialog;
