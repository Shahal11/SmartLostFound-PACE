// src/components/shared/LoadingSpinner.js
import React from 'react';

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center">
      <svg className="animate-spin h-6 w-6 text-gray-500" viewBox="0 0 24 24">
        {/* svg paths */}
      </svg>
      <div className="text-sm text-gray-600 mt-2">{message}</div>
    </div>
  );
}