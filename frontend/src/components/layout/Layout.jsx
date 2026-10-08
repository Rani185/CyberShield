import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopNav from './TopNav.jsx';

/**
 * Root layout — wraps every page with the fixed sidebar and top nav.
 *
 * The `lastUpdated` Date is lifted here so TopNav can display it;
 * pages that poll data call window.__setLastUpdated(new Date()) or
 * we expose a context. We use a simple React state + context approach.
 */
export const LastUpdatedContext = React.createContext({
  lastUpdated: null,
  setLastUpdated: () => {},
});

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  return (
    <LastUpdatedContext.Provider value={{ lastUpdated, setLastUpdated }}>
      {/* Sidebar */}
      <Sidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Top Nav */}
      <TopNav
        onMenuToggle={() => setSidebarOpen((o) => !o)}
        lastUpdated={lastUpdated}
      />

      {/* Main content area — offset by sidebar width + top bar height */}
      <main className="lg:ml-60 pt-14 min-h-screen bg-navy">
        <div className="p-5 lg:p-6">
          <Outlet />
        </div>
      </main>
    </LastUpdatedContext.Provider>
  );
}
