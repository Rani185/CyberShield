import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pagination controls.
 *
 * Props:
 *  - page       current 1-based page number
 *  - totalPages total number of pages
 *  - onPage     (newPage) => void
 *  - totalItems (optional) total item count for display
 *  - limit      (optional) items per page for display
 */
export default function Pagination({ page, totalPages, onPage, totalItems, limit }) {
  if (!totalPages || totalPages <= 1) return null;

  const showingFrom = totalItems ? (page - 1) * (limit || 20) + 1 : null;
  const showingTo   = totalItems ? Math.min(page * (limit || 20), totalItems) : null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-subtle">
      {/* Item count */}
      <span className="text-xs text-text-muted">
        {totalItems != null
          ? `Showing ${showingFrom}–${showingTo} of ${totalItems}`
          : `Page ${page} of ${totalPages}`}
      </span>

      {/* Prev / Next */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} className="text-text-muted" />
        </button>

        {/* Page numbers (max 5 shown) */}
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => {
            // always show first, last, current, and neighbours
            return (
              p === 1 || p === totalPages ||
              Math.abs(p - page) <= 1
            );
          })
          .reduce((acc, p, i, arr) => {
            if (i > 0 && p - arr[i - 1] > 1) {
              acc.push('...');
            }
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="px-1 text-text-muted text-xs">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                className={`min-w-[28px] h-7 px-2 text-xs rounded transition-colors ${
                  p === page
                    ? 'bg-accent-cyan text-navy font-semibold'
                    : 'text-text-muted hover:bg-subtle'
                }`}
              >
                {p}
              </button>
            )
          )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight size={16} className="text-text-muted" />
        </button>
      </div>
    </div>
  );
}
