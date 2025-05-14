import React from 'react';

/**
 * Component for displaying upload information, statistics and warnings
 */
const UploadInfoDialog = ({ 
  stats, 
  warnings, 
  onClose 
}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(107, 114, 128, 0.25)' }}>
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 className="text-lg font-medium text-blue-600 mb-2">CSV Upload Information</h3>
        
        {stats && (
          <div className="mb-4 bg-gray-50 p-3 rounded border border-gray-200">
            <h4 className="font-medium text-gray-700 mb-1">File Statistics:</h4>
            <ul className="text-sm text-gray-600">
              <li>Total records: {stats.rowCount}</li>
              {stats.headerCount && <li>Columns: {stats.headerCount}</li>}
              {stats.missingHeadersCount > 0 && (
                <li className="text-yellow-600">Missing headers: {stats.missingHeadersCount}</li>
              )}
              {stats.unexpectedHeadersCount > 0 && (
                <li className="text-yellow-600">Extra headers: {stats.unexpectedHeadersCount}</li>
              )}
            </ul>
          </div>
        )}
        
        {warnings && warnings.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-yellow-600 mb-1">Warnings:</h4>
            <ul className="text-sm text-gray-600 max-h-60 overflow-y-auto bg-yellow-50 p-3 rounded border border-yellow-200">
              {warnings.map((warning, index) => (
                <li key={index} className="mb-2 pb-2 border-b border-yellow-100 last:border-b-0">
                  {warning.includes(' - Field:') ? (
                    <div>
                      <p className="font-medium">{warning.split(' - ')[0]}</p>
                      <div className="mt-1 ml-2 grid grid-cols-3 gap-1 text-sm">
                        <div className="font-medium">Field:</div>
                        <div className="col-span-2">{warning.split('Field: ')[1]?.split(',')[0]}</div>
                        
                        <div className="font-medium">Value:</div>
                        <div className="col-span-2 font-mono text-yellow-800 break-all">
                          {warning.split('Value: ')[1]}
                        </div>
                      </div>
                    </div>
                  ) : (
                    warning
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="flex justify-end mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadInfoDialog;
