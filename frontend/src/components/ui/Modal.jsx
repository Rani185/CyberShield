import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Dark overlay modal.
 *
 * Props:
 *  - isOpen   boolean
 *  - onClose  () => void
 *  - title    string
 *  - size     ('sm'|'md'|'lg'|'xl') — defaults to 'md'
 *  - children
 */
export default function Modal({ isOpen, onClose, title, size = 'md', children }) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClass = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  }[size] || 'max-w-xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`relative bg-surface border border-subtle rounded-xl shadow-2xl w-full ${widthClass} max-h-[90vh] flex flex-col`}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-subtle flex-shrink-0">
            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-subtle transition-colors"
              aria-label="Close modal"
            >
              <X size={18} className="text-text-muted" />
            </button>
          </div>
        )}

        {/* Close button when no title */}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded hover:bg-subtle transition-colors"
            aria-label="Close modal"
          >
            <X size={18} className="text-text-muted" />
          </button>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
