import { useState, useCallback, useContext } from 'react';
import {
  getDashboardStats,
  getThreatActivity,
  getThreatDistribution,
  getSystemStatus,
} from '../api/dashboard.js';
import { getEvents } from '../api/events.js';
import { getAlerts } from '../api/alerts.js';
import { usePolling } from './usePolling.js';
import { LastUpdatedContext } from '../components/layout/Layout.jsx';

const POLL_INTERVAL = 8000; // 8 seconds

/**
 * Aggregates all dashboard data into a single hook.
 *
 * Returns:
 *  {
 *    stats, activity, distribution, systemStatus,
 *    recentEvents, recentAlerts,
 *    loading, error, refresh
 *  }
 */
export function useDashboard() {
  const { setLastUpdated } = useContext(LastUpdatedContext);

  const [stats, setStats]               = useState(null);
  const [activity, setActivity]         = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  const fetch = useCallback(async () => {
    try {
      const [
        statsData,
        activityData,
        distributionData,
        systemData,
        eventsData,
        alertsData,
      ] = await Promise.all([
        getDashboardStats(),
        getThreatActivity(),
        getThreatDistribution(),
        getSystemStatus(),
        getEvents({ limit: 10, page: 1 }),
        getAlerts({ limit: 5, page: 1, status: 'OPEN' }),
      ]);

      setStats(statsData);
      setActivity(activityData?.data || activityData || []);
      setDistribution(distributionData?.data || distributionData || []);
      setSystemStatus(systemData);
      setRecentEvents(eventsData?.events || eventsData?.data || eventsData || []);
      setRecentAlerts(alertsData?.alerts || alertsData?.data || alertsData || []);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [setLastUpdated]);

  usePolling(fetch, POLL_INTERVAL, true);

  return {
    stats,
    activity,
    distribution,
    systemStatus,
    recentEvents,
    recentAlerts,
    loading,
    error,
    refresh: fetch,
  };
}
