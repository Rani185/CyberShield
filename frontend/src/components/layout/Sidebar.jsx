import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Bell, Activity, AlertTriangle, Globe,
  Shield, TrendingUp, BarChart2, FileText, Settings, X,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/alerts',     icon: Bell,            label: 'Alerts' },
  { to: '/events',     icon: Activity,        label: 'Events' },
  { to: '/threats',    icon: AlertTriangle,   label: 'Threats' },
  { to: '/ip-monitor', icon: Globe,           label: 'IP Monitor' },
  { to: '/rules',      icon: Shield,          label: 'Detection Rules' },
  { to: '/risk',       icon: TrendingUp,      label: 'Risk Analysis' },
  { to: '/analytics',  icon: BarChart2,       label: 'Analytics' },
  { to: '/reports',    icon: FileText,        label: 'Reports' },
  { to: '/settings',   icon: Settings,        label: 'Settings' },
];

/**
 * Sidebar navigation.
 *
 * Props:
 *  - mobileOpen  boolean — controls mobile drawer visibility
 *  - onClose     () => void — called when mobile close btn pressed
 */
export default function Sidebar({ mobileOpen, onClose }) {
  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-60 bg-sidebar border-r border-subtle
          flex flex-col z-40 transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-subtle">
          <div className="flex items-center gap-2.5">
            <Shield size={22} className="text-accent-cyan" />
            <span className="text-accent-cyan font-bold text-base tracking-wide">
              CyberShield
            </span>
          </div>
          {/* Mobile close */}
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded hover:bg-subtle text-text-muted"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={() => { if (mobileOpen) onClose(); }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'text-accent-cyan bg-accent-cyan/10 border-l-2 border-accent-cyan pl-[10px]'
                        : 'text-text-muted hover:text-text-primary hover:bg-subtle/50 border-l-2 border-transparent pl-[10px]'
                    }`
                  }
                >
                  <Icon size={17} className="flex-shrink-0" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-subtle">
          <p className="text-xs text-text-muted">v1.0.0</p>
        </div>
      </aside>
    </>
  );
}
