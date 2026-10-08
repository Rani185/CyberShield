import React from 'react';

/**
 * Shows: ● LIVE | Last updated: {timestamp}
 *
 * Props:
 *  - lastUpdated  Date | null
 */
export default function LiveIndicator({ lastUpdated }) {
  const timeString = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  return (
    <div className="flex items-center gap-2 text-xs text-text-muted select-none">
      {/* Pulsing green dot */}
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-green-400 live-dot" />
        <span className="text-green-400 font-semibold tracking-wide">LIVE</span>
      </span>
      <span className="text-subtle">|</span>
      <span>Last updated: <span className="text-text-primary">{timeString}</span></span>
    </div>
  );
}
