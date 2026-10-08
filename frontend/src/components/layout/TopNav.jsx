import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Bell, Zap } from 'lucide-react';
import LiveIndicator from '../ui/LiveIndicator.jsx';
import Modal from '../ui/Modal.jsx';
import { simulateEvent } from '../../api/simulator.js';
import { toastSuccess, toastError } from '../ui/Toast.jsx';

/** Map route paths to human-readable page titles */
const PAGE_TITLES = {
  '/dashboard':  'Dashboard',
  '/alerts':     'Alerts',
  '/events':     'Events',
  '/threats':    'Threats',
  '/ip-monitor': 'IP Monitor',
  '/rules':      'Detection Rules',
  '/risk':       'Risk Analysis',
  '/analytics':  'Analytics',
  '/reports':    'Reports',
  '/settings':   'Settings',
};

/** Simulation presets */
const SIM_EVENTS = [
  { type: 'normal_login',            label: 'Normal Login',              color: 'bg-green-600 hover:bg-green-700' },
  { type: 'failed_login',            label: 'Failed Login',              color: 'bg-yellow-600 hover:bg-yellow-700' },
  { type: 'multiple_failed_logins',  label: 'Multiple Failed Logins',    color: 'bg-red-600 hover:bg-red-700', note: 'Triggers AUTH-001' },
  { type: 'authz_failure',           label: 'Authorization Failure',     color: 'bg-yellow-700 hover:bg-yellow-800' },
  { type: 'suspicious_network',      label: 'Suspicious Network Event',  color: 'bg-orange-600 hover:bg-orange-700' },
  { type: 'config_change',           label: 'Sensitive Config Change',   color: 'bg-red-700 hover:bg-red-800' },
];

/**
 * TopNav — fixed top bar.
 *
 * Props:
 *  - onMenuToggle  () => void
 *  - lastUpdated   Date | null
 */
export default function TopNav({ onMenuToggle, lastUpdated }) {
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || 'CyberShield';

  const [simOpen, setSimOpen] = useState(false);
  const [simLoading, setSimLoading] = useState(null); // tracks which event_type is loading

  async function handleSimulate(event_type) {
    setSimLoading(event_type);
    try {
      const result = await simulateEvent(event_type);
      toastSuccess(`Simulated: ${event_type.replace(/_/g, ' ')} — ${result.message || 'done'}`);
    } catch (err) {
      toastError(`Simulation failed: ${err.message}`);
    } finally {
      setSimLoading(null);
    }
  }

  return (
    <>
      {/* Bar */}
      <header className="fixed top-0 left-0 lg:left-60 right-0 h-14 bg-navy/90 backdrop-blur-md border-b border-subtle z-20 flex items-center px-4 gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 rounded hover:bg-subtle text-text-muted"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Page title */}
        <h1 className="text-base font-semibold text-text-primary hidden sm:block">{pageTitle}</h1>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Live indicator */}
        <LiveIndicator lastUpdated={lastUpdated} />

        {/* Simulate button */}
        <button
          onClick={() => setSimOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-cyan/10 border border-accent-cyan/30
                     text-accent-cyan text-xs font-medium rounded-lg hover:bg-accent-cyan/20 transition-colors"
        >
          <Zap size={13} />
          Simulate
        </button>

        {/* Notifications icon (visual only — real alerts are on the Alerts page) */}
        <button
          className="p-1.5 rounded hover:bg-subtle text-text-muted hover:text-text-primary transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>
      </header>

      {/* Simulate Events Modal */}
      <Modal isOpen={simOpen} onClose={() => setSimOpen(false)} title="Event Simulator" size="sm">
        {/* Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 mb-5 text-xs text-yellow-400">
          ⚠ Synthetic events only — no real systems are probed
        </div>

        <div className="grid grid-cols-1 gap-2">
          {SIM_EVENTS.map(({ type, label, color, note }) => (
            <button
              key={type}
              onClick={() => handleSimulate(type)}
              disabled={simLoading !== null}
              className={`flex items-center justify-between px-4 py-3 rounded-lg text-white text-sm font-medium
                          transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${color}`}
            >
              <span>{label}</span>
              <span className="flex items-center gap-2">
                {note && (
                  <span className="text-xs opacity-70 italic">{note}</span>
                )}
                {simLoading === type && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                )}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={() => setSimOpen(false)} className="btn-secondary">
            Close
          </button>
        </div>
      </Modal>
    </>
  );
}
