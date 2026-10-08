import React, { useState, useCallback } from 'react';
import { Shield, AlertTriangle, TrendingUp, CheckCircle, Info } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { getDashboardStats, getThreatActivity, getScoreHistory } from '../api/dashboard.js';
import { getAlerts } from '../api/alerts.js';
import { usePolling } from '../hooks/usePolling.js';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';

function scoreColor(score) {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}
function scoreBarColor(score) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

// ─── Recommendation engine (front-end heuristic) ──────────────────────────────

function buildRecommendations({ stats, openAlerts }) {
  const recs = [];
  const critCount = openAlerts.filter((a) => a.severity === 'CRITICAL').length;
  const highCount  = openAlerts.filter((a) => a.severity === 'HIGH').length;

  if (critCount > 0)
    recs.push({ level: 'CRITICAL', text: `Immediately investigate ${critCount} critical open alert${critCount > 1 ? 's' : ''}.` });
  if (highCount > 3)
    recs.push({ level: 'HIGH', text: `${highCount} high-severity alerts are unresolved — prioritise triage.` });
  if ((stats?.security_score ?? 100) < 60)
    recs.push({ level: 'HIGH', text: 'Security score below 60 — review detection rules and alert backlog.' });
  if ((stats?.security_score ?? 100) < 40)
    recs.push({ level: 'CRITICAL', text: 'Security posture is critical — engage incident response team.' });

  // Category-specific
  const authAlerts = openAlerts.filter((a) => (a.category || '').toLowerCase().includes('auth'));
  if (authAlerts.length > 2)
    recs.push({ level: 'HIGH', text: `${authAlerts.length} authentication alerts open — check for brute force activity.` });

  if (recs.length === 0)
    recs.push({ level: 'LOW', text: 'No immediate actions required. Continue monitoring.' });

  return recs;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function RiskAnalysis() {
  const [stats, setStats]             = useState(null);
  const [openAlerts, setOpenAlerts]   = useState([]);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  const load = useCallback(async () => {
    try {
      const [statsData, alertsData, histData] = await Promise.all([
        getDashboardStats(),
        getAlerts({ status: 'OPEN', limit: 100 }),
        getScoreHistory(),
      ]);
      setStats(statsData);
      const alerts = alertsData?.alerts || alertsData?.data || alertsData || [];
      setOpenAlerts(Array.isArray(alerts) ? alerts : []);

      // Real score history from backend
      const histList = Array.isArray(histData) ? histData : [];
      if (histList.length > 0) {
        setScoreHistory(histList.slice(-20).map((d) => ({
          time: d.time ? new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          score: d.score,
        })));
      } else {
        // Fallback
        const s = statsData?.security_score ?? 100;
        setScoreHistory(Array.from({ length: 8 }, (_, i) => ({
          time: `T-${7 - i}`,
          score: Math.max(0, s - (7 - i) * 0.5),
        })));
      }
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(load, 15000, true);

  if (error && !stats) return <ErrorState message={error} onRetry={load} />;

  // Build alert count by category
  const catMap = {};
  openAlerts.forEach((a) => {
    const cat = a.category || 'Other';
    catMap[cat] = (catMap[cat] || 0) + 1;
  });
  const catData = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const recommendations = buildRecommendations({ stats, openAlerts });

  const score = stats?.security_score;

  return (
    <div className="space-y-6">
      {/* ── Top: Security Score ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Big score */}
        <Card className="lg:col-span-1 items-center justify-center py-8" glow={score >= 80 ? 'cyan' : score >= 40 ? undefined : 'red'}>
          {loading ? <Skeleton variant="circle" className="w-32 h-32" /> : (
            <>
              <Shield size={28} className={scoreColor(score)} />
              <div className="text-center mt-2">
                <div className={`text-6xl font-bold ${scoreColor(score)}`}>{score ?? '—'}</div>
                <div className="text-text-muted text-sm mt-1">/ 100</div>
              </div>
              <div className="w-full bg-subtle rounded-full h-2 mt-3">
                <div
                  className={`h-2 rounded-full transition-all duration-700 ${scoreBarColor(score)}`}
                  style={{ width: `${score || 0}%` }}
                />
              </div>
              <Badge
                status={stats?.security_posture || 'GOOD'}
                label={stats?.security_posture || 'GOOD'}
                className="mt-2"
              />
              <p className="text-xs text-text-muted text-center mt-1">
                {score >= 80 ? 'Security posture is good.'
                  : score >= 60 ? 'Some alerts require attention.'
                  : score >= 40 ? 'Elevated risk — action needed.'
                  : 'Critical risk level — immediate response required.'}
              </p>
            </>
          )}
        </Card>

        {/* Risk count cards */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {[
            { label: 'Critical Open',  count: openAlerts.filter((a) => a.severity === 'CRITICAL').length, color: 'text-red-400',    icon: AlertTriangle },
            { label: 'High Open',      count: openAlerts.filter((a) => a.severity === 'HIGH').length,     color: 'text-orange-400', icon: AlertTriangle },
            { label: 'Medium Open',    count: openAlerts.filter((a) => a.severity === 'MEDIUM').length,   color: 'text-yellow-400', icon: AlertTriangle },
            { label: 'Low Open',       count: openAlerts.filter((a) => a.severity === 'LOW').length,      color: 'text-green-400',  icon: CheckCircle },
          ].map(({ label, count, color, icon: Icon }) => (
            <Card key={label}>
              <div className="flex items-center gap-2">
                <Icon size={15} className={color} />
                <span className="text-xs text-text-muted">{label}</span>
              </div>
              {loading ? <Skeleton /> : (
                <div className={`text-3xl font-bold ${color}`}>{count}</div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* ── Middle: Charts ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Risk by Category */}
        <Card title="Risk by Category (Open Alerts)">
          {loading ? <Skeleton variant="card" /> : catData.length === 0 ? (
            <p className="text-sm text-text-muted py-6 text-center">No open alerts</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={catData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <XAxis type="number" tick={{ fill: '#8892a4', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#8892a4', fontSize: 11 }} width={110} />
                <Tooltip
                  contentStyle={{ background: '#0d1424', border: '1px solid #1e2d45', borderRadius: 6 }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="count" name="Alerts" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Security Score History */}
        <Card title="Security Score Trend">
          {loading ? <Skeleton variant="card" /> : scoreHistory.length === 0 ? (
            <p className="text-sm text-text-muted py-6 text-center">No history data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={scoreHistory} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                <XAxis dataKey="time" tick={{ fill: '#8892a4', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#8892a4', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0d1424', border: '1px solid #1e2d45', borderRadius: 6 }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Line type="monotone" dataKey="score" name="Score" stroke="#00d4ff" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ── Bottom: Recommendations ────────────────────────────────────── */}
      <Card title="Security Recommendations" icon={<TrendingUp size={15} />}>
        {loading ? <Skeleton count={3} /> : (
          <div className="space-y-2">
            {recommendations.map((rec, i) => {
              const colorClass =
                rec.level === 'CRITICAL' ? 'border-l-red-500 bg-red-500/5'
                : rec.level === 'HIGH'   ? 'border-l-orange-500 bg-orange-500/5'
                : rec.level === 'MEDIUM' ? 'border-l-yellow-500 bg-yellow-500/5'
                : 'border-l-green-500 bg-green-500/5';
              return (
                <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-r-lg border-l-2 ${colorClass}`}>
                  <Info size={14} className="text-text-muted mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-text-primary">{rec.text}</p>
                  <Badge severity={rec.level} className="ml-auto flex-shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
