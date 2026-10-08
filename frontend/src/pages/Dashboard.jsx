import React from 'react';
import {
  Bell, AlertTriangle, Activity, Shield,
  TrendingUp, CheckCircle, Clock, AlertCircle,
  Cpu, Database, Server,
} from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell, Tooltip,
  XAxis, YAxis, ResponsiveContainer, Legend,
} from 'recharts';
import { useDashboard } from '../hooks/useDashboard.js';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Table from '../components/ui/Table.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return Tailwind text colour class based on security score */
function scoreColor(score) {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

/** Colour for pie/donut slices */
const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#06b6d4'];

/** Format ISO timestamp to short local time */
function fmtTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, sub, colorClass = 'text-accent-cyan', loading }) {
  return (
    <Card className="gap-2">
      <div className="flex items-center justify-between">
        <span className="text-text-muted text-xs font-medium uppercase tracking-wider">{label}</span>
        <Icon size={18} className={colorClass} />
      </div>
      {loading ? (
        <Skeleton height="h-8" width="w-24" />
      ) : (
        <div className={`text-3xl font-bold ${colorClass}`}>{value ?? '—'}</div>
      )}
      {sub && <p className="text-xs text-text-muted">{sub}</p>}
    </Card>
  );
}

function SecurityScoreCard({ score, loading }) {
  const color = score != null ? scoreColor(score) : 'text-text-muted';
  return (
    <Card className="gap-2">
      <div className="flex items-center justify-between">
        <span className="text-text-muted text-xs font-medium uppercase tracking-wider">Security Score</span>
        <Shield size={18} className={color} />
      </div>
      {loading ? (
        <Skeleton height="h-8" width="w-24" />
      ) : (
        <div className="flex items-end gap-1">
          <span className={`text-4xl font-bold ${color}`}>{score ?? '—'}</span>
          <span className="text-text-muted text-lg mb-1">/100</span>
        </div>
      )}
      <div className="w-full bg-subtle rounded-full h-1.5 mt-1">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${
            score >= 80 ? 'bg-green-400' : score >= 60 ? 'bg-yellow-400' : score >= 40 ? 'bg-orange-400' : 'bg-red-400'
          }`}
          style={{ width: `${score || 0}%` }}
        />
      </div>
    </Card>
  );
}

/** System status row */
function StatusDot({ status }) {
  const ok = (status || '').toLowerCase() === 'healthy' || status === true || status === 'ok' || status === 'running';
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-green-400' : 'bg-red-400'}`} />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const {
    stats, activity, distribution, systemStatus,
    recentEvents, recentAlerts,
    loading, error, refresh,
  } = useDashboard();

  if (error && !stats) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  // ── Event table columns
  const eventColumns = [
    {
      key: 'timestamp',
      label: 'Time',
      render: (v) => <span className="text-text-muted text-xs">{fmtTime(v)}</span>,
    },
    { key: 'event_type', label: 'Type', render: (v) => v || '—' },
    {
      key: 'source_ip',
      label: 'Source IP',
      render: (v) => <span className="font-mono text-xs">{v || '—'}</span>,
    },
    {
      key: 'severity',
      label: 'Severity',
      render: (v) => v ? <Badge severity={v} /> : '—',
    },
  ];

  // ── Recent alerts columns
  const alertColumns = [
    {
      key: 'severity',
      label: 'Sev',
      render: (v) => v ? <Badge severity={v} /> : '—',
    },
    { key: 'title', label: 'Alert' },
    {
      key: 'status',
      label: 'Status',
      render: (v) => v ? <Badge status={v} /> : '—',
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (v) => <span className="text-xs text-text-muted">{fmtDate(v)}</span>,
    },
  ];

  // Normalise distribution data for Recharts
  const pieData = distribution.map((d) => ({
    name: d.category || d.name || d.label || 'Unknown',
    value: d.count || d.value || 0,
  }));

  // Normalise threat activity
  const actData = activity.map((d) => ({
    hour: d.hour || d.time || d.timestamp || '',
    events: d.events ?? d.event_count ?? 0,
    alerts: d.alerts ?? d.alert_count ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* ── Row 1: 4 Metric Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SecurityScoreCard score={stats?.security_score} loading={loading} />
        <MetricCard
          icon={Bell}
          label="Active Alerts"
          value={stats?.active_alerts}
          colorClass="text-orange-400"
          loading={loading}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Critical Threats"
          value={stats?.critical_threats}
          colorClass="text-red-400"
          loading={loading}
        />
        <MetricCard
          icon={Activity}
          label="Events Analyzed"
          value={stats?.events_analyzed?.toLocaleString()}
          colorClass="text-accent-cyan"
          loading={loading}
        />
      </div>

      {/* ── Row 2: 3 Secondary Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Detection Rules */}
        <Card>
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-accent-cyan" />
            <span className="text-xs text-text-muted uppercase tracking-wider font-medium">Detection Rules</span>
          </div>
          {loading ? <Skeleton /> : (
            <div className="text-2xl font-bold text-text-primary">
              {stats?.detection_rules ?? '—'}
            </div>
          )}
        </Card>

        {/* Security Posture */}
        <Card>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-accent-cyan" />
            <span className="text-xs text-text-muted uppercase tracking-wider font-medium">Security Posture</span>
          </div>
          {loading ? <Skeleton /> : (
            <div className="mt-1">
              <Badge
                status={stats?.security_posture || 'GOOD'}
                label={stats?.security_posture || 'GOOD'}
              />
            </div>
          )}
        </Card>

        {/* Alert Status Breakdown */}
        <Card>
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-accent-cyan" />
            <span className="text-xs text-text-muted uppercase tracking-wider font-medium">Alert Status</span>
          </div>
          {loading ? <Skeleton count={3} /> : (
            <div className="flex flex-col gap-1.5 mt-1">
              {[
                { label: 'Open',          val: stats?.open_alerts,          icon: AlertCircle, color: 'text-red-400' },
                { label: 'Investigating', val: stats?.investigating_alerts,  icon: Clock,       color: 'text-yellow-400' },
                { label: 'Resolved',      val: stats?.resolved_alerts,       icon: CheckCircle, color: 'text-green-400' },
              ].map(({ label, val, icon: Icon, color }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-text-muted">
                    <Icon size={13} className={color} />
                    {label}
                  </span>
                  <span className={`font-semibold ${color}`}>{val ?? 0}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Row 3: Charts ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Threat Activity — area chart */}
        <Card title="Threat Activity (24h)" className="xl:col-span-2">
          {loading ? <Skeleton variant="card" /> : actData.length === 0 ? (
            <EmptyState message="No activity data" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={actData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gAlerts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" tick={{ fill: '#8892a4', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8892a4', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0d1424', border: '1px solid #1e2d45', borderRadius: 6 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#8892a4' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#8892a4' }} />
                <Area type="monotone" dataKey="events" name="Events" stroke="#00d4ff" fill="url(#gEvents)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="alerts" name="Alerts" stroke="#ef4444" fill="url(#gAlerts)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Threat Distribution — pie chart */}
        <Card title="Threat Distribution">
          {loading ? <Skeleton variant="card" /> : pieData.length === 0 ? (
            <EmptyState message="No distribution data" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0d1424', border: '1px solid #1e2d45', borderRadius: 6 }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend
                  formatter={(value) => <span style={{ color: '#8892a4', fontSize: 11 }}>{value}</span>}
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ── Row 4: Events table + Alerts list + System Status ───────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Security Events */}
        <Card title="Recent Security Events" className="xl:col-span-1">
          {loading ? <Skeleton variant="table-row" count={5} /> : (
            <Table
              columns={eventColumns}
              data={recentEvents.slice(0, 10)}
              keyField="id"
              emptyMessage="No recent events"
            />
          )}
        </Card>

        {/* Active Alerts */}
        <Card title="Active Alerts" className="xl:col-span-1">
          {loading ? <Skeleton variant="table-row" count={5} /> : (
            <Table
              columns={alertColumns}
              data={recentAlerts.slice(0, 5)}
              keyField="id"
              emptyMessage="No open alerts"
            />
          )}
        </Card>

        {/* System Status */}
        <Card title="System Status" className="xl:col-span-1">
          {loading ? <Skeleton count={3} /> : (
            <div className="flex flex-col gap-3">
              {[
                { label: 'API Service',       key: 'api',              icon: Server },
                { label: 'Database',          key: 'database',         icon: Database },
                { label: 'Detection Engine',  key: 'detection_engine', icon: Cpu },
              ].map(({ label, key, icon: Icon }) => {
                const raw = systemStatus?.[key];
                const status = typeof raw === 'object' ? raw?.status : raw;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-text-muted">
                      <Icon size={15} />
                      {label}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      <StatusDot status={status} />
                      <span className={
                        (String(status).toLowerCase() === 'healthy' || status === 'running')
                          ? 'text-green-400' : 'text-red-400'
                      }>
                        {status || 'Unknown'}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
