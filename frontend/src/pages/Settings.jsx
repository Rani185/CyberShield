import React, { useState } from 'react';
import { User, Bell, Moon, Link, Info, Shield } from 'lucide-react';
import Card from '../components/ui/Card.jsx';

/** Simple toggle component (UI only) */
function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-subtle last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent
                    transition-colors duration-200 focus:outline-none cursor-pointer
                    ${checked ? 'bg-accent-cyan' : 'bg-subtle'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
                      ${checked ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}

export default function Settings() {
  // Notification preferences (UI state only — no backend)
  const [notifCritical, setNotifCritical]     = useState(true);
  const [notifHigh, setNotifHigh]             = useState(true);
  const [notifMedium, setNotifMedium]         = useState(false);
  const [notifResolve, setNotifResolve]       = useState(true);
  const [notifSimulate, setNotifSimulate]     = useState(true);
  const [emailAlerts, setEmailAlerts]         = useState(false);

  const backendUrl = 'http://localhost:8000';

  return (
    <div className="max-w-2xl space-y-5">
      {/* ── Profile ───────────────────────────────────────────────────── */}
      <Card title="Profile" icon={<User size={15} />}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center">
            <Shield size={22} className="text-accent-cyan" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">SOC Analyst</p>
            <p className="text-xs text-text-muted mt-0.5">CyberShield SOC Dashboard</p>
            <p className="text-xs text-text-muted">Role: Administrator</p>
          </div>
        </div>
      </Card>

      {/* ── Notification Preferences ──────────────────────────────────── */}
      <Card title="Notification Preferences" icon={<Bell size={15} />}>
        <Toggle
          checked={notifCritical}
          onChange={setNotifCritical}
          label="Critical Alerts"
          description="Show toast notification for CRITICAL severity alerts"
        />
        <Toggle
          checked={notifHigh}
          onChange={setNotifHigh}
          label="High Alerts"
          description="Show toast notification for HIGH severity alerts"
        />
        <Toggle
          checked={notifMedium}
          onChange={setNotifMedium}
          label="Medium Alerts"
          description="Show toast notification for MEDIUM severity alerts"
        />
        <Toggle
          checked={notifResolve}
          onChange={setNotifResolve}
          label="Resolution Events"
          description="Notify when an alert is resolved or investigated"
        />
        <Toggle
          checked={notifSimulate}
          onChange={setNotifSimulate}
          label="Simulation Results"
          description="Show toast after each event simulation"
        />
        <Toggle
          checked={emailAlerts}
          onChange={setEmailAlerts}
          label="Email Alerts"
          description="Send email for critical alerts (requires email config)"
        />
      </Card>

      {/* ── Appearance ─────────────────────────────────────────────────── */}
      <Card title="Appearance" icon={<Moon size={15} />}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">Dark Mode</p>
            <p className="text-xs text-text-muted mt-0.5">CyberShield is designed exclusively for dark mode</p>
          </div>
          <span className="text-xs bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30 px-2 py-1 rounded font-medium">
            Always On
          </span>
        </div>
      </Card>

      {/* ── API Configuration ──────────────────────────────────────────── */}
      <Card title="API Configuration" icon={<Link size={15} />}>
        <div className="space-y-3">
          <div>
            <label className="section-label block mb-1">Backend URL</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={backendUrl}
                readOnly
                className="input-field font-mono text-xs flex-1"
              />
              <span className="flex items-center gap-1 text-xs text-green-400 font-medium whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                Connected
              </span>
            </div>
          </div>
          <div>
            <label className="section-label block mb-1">Poll Interval</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value="8 seconds (Dashboard), 10–30 seconds (other pages)"
                readOnly
                className="input-field text-xs flex-1"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* ── About ──────────────────────────────────────────────────────── */}
      <Card title="About" icon={<Info size={15} />}>
        <div className="space-y-2 text-sm">
          {[
            ['Application',  'CyberShield SOC Monitoring Dashboard'],
            ['Version',      'v1.0.0'],
            ['Frontend',     'React 18 + Vite + Tailwind CSS'],
            ['Charts',       'Recharts'],
            ['Backend',      'FastAPI (Python)'],
            ['Description',  'Real-time Security Operations Centre monitoring platform with automated threat detection, alert management, and risk analysis.'],
          ].map(([label, val]) => (
            <div key={label} className="flex gap-2">
              <span className="text-text-muted w-28 flex-shrink-0">{label}:</span>
              <span className="text-text-primary">{val}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
