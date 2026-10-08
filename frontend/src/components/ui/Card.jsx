import React from 'react';

/**
 * Dark surface card with subtle border.
 *
 * Props:
 *  - title (string)
 *  - icon  (ReactNode)  shown left of title
 *  - className (string) extra classes on the outer div
 *  - glow  ('cyan'|'red'|'blue'|null) — optional glow
 *  - children
 */
export default function Card({ title, icon, className = '', glow, children }) {
  const glowClass = glow === 'cyan' ? 'glow-cyan'
    : glow === 'red'  ? 'glow-red'
    : glow === 'blue' ? 'glow-blue'
    : '';

  return (
    <div
      className={`bg-surface border border-subtle rounded-xl p-5 flex flex-col gap-3 ${glowClass} ${className}`}
    >
      {(title || icon) && (
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-accent-cyan flex-shrink-0">{icon}</span>
          )}
          {title && (
            <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
