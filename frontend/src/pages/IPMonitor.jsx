import React, { useState, useCallback } from 'react';
import { Globe } from 'lucide-react';
import { getIPStats } from '../api/ipMonitor.js';
import { usePolling } from '../hooks/usePolling.js';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Colored progress bar for risk score 0-100 */
function RiskBar({ score }) {
  const pct = Math.min(100, Math.max(0, score ?? 0));
  const color =
    pct >= 75 ? 'bg-red-500'
    : pct >= 50 ? 'bg-orange-500'
    : pct >= 25 ? 'bg-yellow-500'
    : 'bg-green-500';

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 bg-subtle rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium w-7 text-right">{pct}</span>
    </div>
  );
}

export default function IPMonitor() {
  const [ips, setIps]         = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await getIPStats();
      const list = Array.isArray(res) ? res : (res?.ips || res?.data || []);
      setIps(list);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(load, 12000, true);

  if (error && !ips.length) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-muted">
        {loading ? '…' : `Monitoring ${ips.length} IP address${ips.length !== 1 ? 'es' : ''}`}
      </p>

      <Card>
        {loading && ips.length === 0 ? (
          <Skeleton variant="table-row" count={8} />
        ) : ips.length === 0 ? (
          <EmptyState message="No IP activity recorded yet" icon={<Globe size={40} strokeWidth={1.2} />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['IP Address', 'Total Events', 'Failed Logins', 'Alerts', 'Highest Severity', 'Risk Score', 'Last Seen'].map((h) => (
                    <th key={h} className="table-header text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ips.map((ip) => (
                  <tr key={ip.ip || ip.ip_address} className="border-b border-subtle hover:bg-subtle/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-accent-cyan text-sm">{ip.ip || ip.ip_address}</td>
                    <td className="px-4 py-3 text-text-primary">{ip.total_events ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={ip.failed_logins > 0 ? 'text-red-400 font-semibold' : 'text-text-muted'}>
                        {ip.failed_logins ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-primary">{ip.alerts ?? ip.alert_count ?? 0}</td>
                    <td className="px-4 py-3">
                      {ip.highest_severity
                        ? <Badge severity={ip.highest_severity} />
                        : <span className="text-text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <RiskBar score={ip.risk_score} />
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">
                      {fmtDate(ip.last_seen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
