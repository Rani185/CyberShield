import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Error state shown when an API call fails.
 *
 * Props:
 *  - message  string  — error description
 *  - onRetry  () => void  — if provided, shows a Retry button
 */
export default function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <AlertTriangle size={40} strokeWidth={1.2} className="text-red-400" />
      <p className="text-sm font-medium text-red-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent-cyan transition-colors mt-1"
        >
          <RefreshCw size={13} />
          Retry
        </button>
      )}
    </div>
  );
}
