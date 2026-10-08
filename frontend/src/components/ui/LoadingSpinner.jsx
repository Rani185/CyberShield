import React from 'react';

/**
 * Spinning cyan circle loading indicator.
 *
 * Props:
 *  - size  ('sm'|'md'|'lg') — defaults to 'md'
 *  - className  extra classes
 */
export default function LoadingSpinner({ size = 'md', className = '' }) {
  const dim = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6';
  const border = size === 'sm' ? 'border-2' : 'border-[3px]';

  return (
    <div
      className={`${dim} ${border} border-accent-cyan border-t-transparent rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
