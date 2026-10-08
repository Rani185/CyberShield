import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Alerts from './pages/Alerts.jsx';
import Events from './pages/Events.jsx';
import Threats from './pages/Threats.jsx';
import IPMonitor from './pages/IPMonitor.jsx';
import Rules from './pages/Rules.jsx';
import RiskAnalysis from './pages/RiskAnalysis.jsx';
import Analytics from './pages/Analytics.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  return (
    <BrowserRouter>
      {/* Global toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0d1424',
            color: '#e2e8f0',
            border: '1px solid #1e2d45',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#0d1424' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#0d1424' } },
        }}
      />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"    element={<Dashboard />} />
          <Route path="alerts"       element={<Alerts />} />
          <Route path="events"       element={<Events />} />
          <Route path="threats"      element={<Threats />} />
          <Route path="ip-monitor"   element={<IPMonitor />} />
          <Route path="rules"        element={<Rules />} />
          <Route path="risk"         element={<RiskAnalysis />} />
          <Route path="analytics"    element={<Analytics />} />
          <Route path="reports"      element={<Reports />} />
          <Route path="settings"     element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
