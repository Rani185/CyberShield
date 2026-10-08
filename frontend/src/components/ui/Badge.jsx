import React from 'react';

/**
 * Severity badge — CRITICAL, HIGH, MEDIUM, LOW, INFO
 * Status badge  — OPEN, INVESTIGATING, RESOLVED
 *
 * Usage:
 *   <Badge severity="CRITICAL" />
 *   <Badge status="OPEN" />
 *   <Badge label="Custom" color="cyan" />
 */

const SEVERITY_STYLES = {
  CRITICAL:      'bg-red-500/20 text-red-400 border border-red-500/40',
  HIGH:          'bg-orange-500/20 text-orange-400 border border-orange-500/40',
  MEDIUM:        'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
  LOW:           'bg-green-500/20 text-green-400 border border-green-500/40',
  INFO:          'bg-blue-500/20 text-blue-400 border border-blue-500/40',
};

const STATUS_STYLES = {
  OPEN:          'bg-red-500/10 text-red-400 border border-red-500/30',
  INVESTIGATING: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30',
  RESOLVED:      'bg-green-500/10 text-green-400 border border-green-500/30',
  // rule / misc
  ENABLED:       'bg-green-500/10 text-green-400 border border-green-500/30',
  DISABLED:      'bg-gray-500/10 text-gray-400 border border-gray-500/30',
  // posture
  GOOD:          'bg-green-500/20 text-green-400 border border-green-500/40',
  MODERATE:      'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
  ELEVATED:      'bg-orange-500/20 text-orange-400 border border-orange-500/40',
};

export default function Badge({ severity, status, label, className = '' }) {
  const key = (severity || status || '').toUpperCase();
  const style = SEVERITY_STYLES[key] || STATUS_STYLES[key] || 'bg-gray-500/20 text-gray-400 border border-gray-500/40';
  const text  = label || key;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${style} ${className}`}
    >
      {text}
    </span>
  );
}
