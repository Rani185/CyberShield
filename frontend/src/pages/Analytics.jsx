import React, { useState, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import { getDashboardStats, getThreatActivity, getThreatDistribution, getScoreHistory } from '../api/dashboard.js';
import { getAlerts } from '../api/alerts.js';
import { getEvents } from '../api/events.js';
import { getIPStats } from '../api/ipMonitor.js';
import { usePolling } from '../hooks/usePolling.js';
import Card from '../components/ui/Card.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';

const PIE_COLORS  = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#06b6d4'];
const SEV_COLORS  = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e', INFO: '#3b82f6' };

const TOOLTIP_STYLE = {
  contentStyle: { background: '#0d1424', border: '1px solid #1e2d45', borderRadius: 6 },
  itemStyle: { color: '#e2e8f0' },
  labelStyle: { color: '#8892a4' },
};

export default function Analytics() {
  const [activity, setActivity]         = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [eventsByCat, setEventsByCat]   = useState([]);
  const [alertsBySev, setAlertsBySev]   = useState([]);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [topIPs, setTopIPs]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  const load = useCallback(async () => {
    try {
      const [actData, distData, eventsData, alertsData, statsData, ipData, histData] = await Promise.all([
        getThreatActivity(),
        getThreatDistribution(),
        getEvents({ limit: 200 }),
        getAlerts({ limit: 200 }),
        getDashboardStats(),
        getIPStats(),
        getScoreHistory(),
      ]);

      // Threat activity
      const actList = actData?.data || actData || [];
      setActivity(actList.map((d) => ({
        hour:   d.hour || d.time || '',
        events: d.events ?? d.event_count ?? 0,
        alerts: d.alerts ?? d.alert_count ?? 0,
      })));

      // Threat distribution pie
      const distList = distData?.data || distData || [];
      setDistribution(distList.map((d) => ({
        name:  d.category || d.name || 'Unknown',
        value: d.count || d.value || 0,
      })));

      // Events by category — count per category from events list
      const evList = eventsData?.events || eventsData?.data || eventsData || [];
      const evCatMap = {};
      evList.forEach((e) => {
        const cat = e.category || 'Other';
        evCatMap[cat] = (evCatMap[cat] || 0) + 1;
      });
      setEventsByCat(
        Object.entries(evCatMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([name, count]) => ({ name, count }))
      );

      // Alerts by severity
      const alList = alertsData?.alerts || alertsData?.data || alertsData || [];
      const sevMap = {};
      alList.forEach((a) => {
        const sev = a.severity || 'INFO';
        sevMap[sev] = (sevMap[sev] || 0) + 1;
      });
      setAlertsBySev(
        ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']
          .filter((s) => sevMap[s])
          .map((s) => ({ name: s, count: sevMap[s], fill: SEV_COLORS[s] }))
      );

      // Security score history — real data from backend
      const histList = Array.isArray(histData) ? histData : [];
      if (histList.length > 0) {
        setScoreHistory(histList.slice(-24).map((d) => ({
          time:  d.time ? new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          score: d.score,
        })));
      } else {
        // Fallback: synthesize from current score + activity buckets
        const currentScore = statsData?.security_score ?? 100;
        setScoreHistory(
          actList.slice(-12).map((d, i, arr) => ({
            time:  d.hour || `H${i}`,
            score: Math.max(0, currentScore - (arr.length - 1 - i) * 0.3),
          }))
        );
      }

      // Top IPs by total events
      const ipList = Array.isArray(ipData) ? ipData : (ipData?.ips || ipData?.data || []);
      setTopIPs(
        [...ipList]
          .sort((a, b) => (b.total_events ?? 0) - (a.total_events ?? 0))
          .slice(0, 8)
          .map((ip) => ({ name: ip.ip || ip.ip_address || 'Unknown', count: ip.total_events ?? 0 }))
      );

      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(load, 20000, true);

  if (error && !activity.length) return <ErrorState message={error} onRetry={load} />;

  const chartSkeleton = <Skeleton variant="card" className="h-52" />;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* 1. Threat Activity */}
      <Card title="Threat Activity (24h)">
        {loading ? chartSkeleton : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={activity} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="aEvents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="aAlerts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fill: '#8892a4', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8892a4', fontSize: 11 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#8892a4' }} />
              <Area type="monotone" dataKey="events" name="Events" stroke="#00d4ff" fill="url(#aEvents)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="alerts" name="Alerts" stroke="#ef4444" fill="url(#aAlerts)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* 2. Threat Distribution (pie) */}
      <Card title="Threat Distribution">
        {loading ? chartSkeleton : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={distribution} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                {distribution.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend formatter={(v) => <span style={{ color: '#8892a4', fontSize: 11 }}>{v}</span>} iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* 3. Events by Category */}
      <Card title="Events by Category">
        {loading ? chartSkeleton : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={eventsByCat} margin={{ top: 5, right: 10, bottom: 20, left: -20 }}>
              <XAxis dataKey="name" tick={{ fill: '#8892a4', fontSize: 10 }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fill: '#8892a4', fontSize: 11 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="count" name="Events" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* 4. Alerts by Severity */}
      <Card title="Alerts by Severity">
        {loading ? chartSkeleton : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={alertsBySev} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
              <XAxis dataKey="name" tick={{ fill: '#8892a4', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8892a4', fontSize: 11 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="count" name="Alerts" radius={[4, 4, 0, 0]}>
                {alertsBySev.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* 5. Security Score History */}
      <Card title="Security Score Trend">
        {loading ? chartSkeleton : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={scoreHistory} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
              <XAxis dataKey="time" tick={{ fill: '#8892a4', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#8892a4', fontSize: 11 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="score" name="Score" stroke="#00d4ff" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* 6. Top Source IPs */}
      <Card title="Top Source IPs (by Events)">
        {loading ? chartSkeleton : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topIPs} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <XAxis type="number" tick={{ fill: '#8892a4', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#8892a4', fontSize: 10 }} width={115} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="count" name="Events" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}
