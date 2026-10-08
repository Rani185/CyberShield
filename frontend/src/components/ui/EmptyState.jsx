import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Empty state placeholder shown when a list or table has no data.
 *
 * Props:
 *  - message  string  — main message
 *  - sub      string  — optional sub-text
 *  - icon     ReactNode — optional override icon
 */
export default function EmptyState({
  message = 'No data found',
  sub,
  icon,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
      <span className="text-subtle">
        {icon || <AlertCircle size={40} strokeWidth={1.2} />}
      </span>
      <p className="text-sm font-medium text-text-muted">{message}</p>
      {sub && <p className="text-xs text-text-muted/60">{sub}</p>}
    </div>
  );
}
