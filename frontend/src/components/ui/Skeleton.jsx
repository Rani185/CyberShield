import React from 'react';

/**
 * Loading skeleton placeholders that pulse.
 *
 * Variants:
 *  - 'text'      → short rounded bar (default)
 *  - 'card'      → full card-height block
 *  - 'table-row' → full-width thin bar, good for table rows
 *  - 'circle'    → circular avatar / icon placeholder
 *
 * Props:
 *  - variant  ('text'|'card'|'table-row'|'circle')
 *  - width    (Tailwind width class, e.g. 'w-32')
 *  - height   (Tailwind height class, e.g. 'h-4')
 *  - className (extra classes)
 *  - count    (number) — render multiple rows (useful for tables)
 */
const BASE = 'bg-subtle/60 animate-pulse rounded';

function SingleSkeleton({ variant = 'text', width, height, className = '' }) {
  if (variant === 'card') {
    return (
      <div className={`${BASE} rounded-xl h-40 w-full ${className}`} />
    );
  }
  if (variant === 'table-row') {
    return (
      <div className={`flex items-center gap-3 py-3 border-b border-subtle ${className}`}>
        <div className={`${BASE} h-3 flex-1`} />
        <div className={`${BASE} h-3 w-24`} />
        <div className={`${BASE} h-3 w-16`} />
        <div className={`${BASE} h-3 w-20`} />
      </div>
    );
  }
  if (variant === 'circle') {
    return (
      <div className={`${BASE} rounded-full h-10 w-10 ${className}`} />
    );
  }
  // default: text
  return (
    <div
      className={`${BASE} h-4 ${width || 'w-full'} ${height || ''} ${className}`}
    />
  );
}

export default function Skeleton({ count = 1, ...props }) {
  if (count === 1) return <SingleSkeleton {...props} />;
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <SingleSkeleton key={i} {...props} />
      ))}
    </div>
  );
}
