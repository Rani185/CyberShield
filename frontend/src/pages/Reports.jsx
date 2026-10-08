import React, { useState, useCallback } from 'react';
import { FileText, Download, Plus } from 'lucide-react';
import { getReports, getReport, generateReport } from '../api/reports.js';
import { usePolling } from '../hooks/usePolling.js';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { toastSuccess, toastError } from '../components/ui/Toast.jsx';

const TIME_RANGES = [
  { label: 'Last 24 hours',  value: 24 },
  { label: 'Last 48 hours',  value: 48 },
  { label: 'Last 7 days',    value: 168 },
  { label: 'Last 30 days',   value: 720 },
];

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Report Detail Modal ───────────────────────────────────────────────────────

function ReportDetailModal({ reportId, onClose }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  React.useEffect(() => {
    if (!reportId) return;
    setLoading(true);
    setError(null);
    getReport(reportId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [reportId]);

  function exportJSON() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${reportId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal isOpen={!!reportId} onClose={onClose} title="Report Details" size="lg">
      {loading && <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>}
      {error && <ErrorState message={error} />}
      {data && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted mb-1">Generated: {fmtDate(data.generated_at)}</p>
              <p className="text-xs text-text-muted">Time Range: {data.time_range_hours}h</p>
            </div>
            <button onClick={exportJSON} className="btn-secondary flex items-center gap-1.5 text-xs">
              <Download size={13} />
              Export JSON
            </button>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Total Events',    data.total_events],
              ['Total Alerts',    data.total_alerts],
              ['Security Score',  data.security_score],
            ].map(([label, val]) => (
              <div key={label} className="bg-navy rounded-lg px-3 py-3 text-center">
                <div className="text-xl font-bold text-accent-cyan">{val ?? '—'}</div>
                <div className="text-xs text-text-muted mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Severity breakdown */}
          {data.severity_breakdown && (
            <section>
              <p className="section-label mb-2">Severity Breakdown</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.severity_breakdown).map(([sev, count]) => (
                  <div key={sev} className="flex items-center gap-1.5">
                    <Badge severity={sev} />
                    <span className="text-xs text-text-muted">{count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Top threats */}
          {data.top_threats && data.top_threats.length > 0 && (
            <section>
              <p className="section-label mb-2">Top Threats</p>
              <div className="space-y-1.5">
                {data.top_threats.map((t, i) => (
                  <div key={i} className="flex items-center justify-between bg-navy rounded-lg px-3 py-2 text-sm">
                    <span className="text-text-primary">{t.name || t.category || 'Unknown'}</span>
                    <span className="text-text-muted text-xs">{t.count} alerts</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Top IPs */}
          {data.top_ips && data.top_ips.length > 0 && (
            <section>
              <p className="section-label mb-2">Top Source IPs</p>
              <div className="space-y-1.5">
                {data.top_ips.map((ip, i) => (
                  <div key={i} className="flex items-center justify-between bg-navy rounded-lg px-3 py-2 text-sm">
                    <span className="font-mono text-accent-cyan text-xs">{ip.ip_address || ip.ip}</span>
                    <span className="text-text-muted text-xs">{ip.count || ip.events} events</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Raw (fallback) */}
          {!data.severity_breakdown && !data.top_threats && (
            <section>
              <p className="section-label mb-2">Raw Report Data</p>
              <pre className="bg-navy text-xs text-text-muted rounded-lg p-3 overflow-auto max-h-60">
                {JSON.stringify(data, null, 2)}
              </pre>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Reports() {
  const [reports, setReports]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [generating, setGen]    = useState(false);
  const [timeRange, setTimeRange] = useState(24);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await getReports();
      const list = res?.reports || res?.data || res || [];
      setReports(Array.isArray(list) ? list : []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(load, 30000, true);

  async function handleGenerate() {
    setGen(true);
    try {
      await generateReport(timeRange);
      toastSuccess('Report generated successfully');
      load();
    } catch (e) {
      toastError(e.message);
    } finally {
      setGen(false);
    }
  }

  if (error && !reports.length) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      {/* Generate bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(Number(e.target.value))}
          className="select-field"
        >
          {TIME_RANGES.map((tr) => (
            <option key={tr.value} value={tr.value}>{tr.label}</option>
          ))}
        </select>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn-primary flex items-center gap-1.5"
        >
          {generating ? <LoadingSpinner size="sm" /> : <Plus size={14} />}
          {generating ? 'Generating…' : 'Generate Report'}
        </button>
        <span className="text-xs text-text-muted">{reports.length} report{reports.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <Card>
        {loading && reports.length === 0 ? (
          <Skeleton variant="table-row" count={5} />
        ) : reports.length === 0 ? (
          <EmptyState
            message="No reports generated yet"
            sub="Use the 'Generate Report' button above to create your first report."
            icon={<FileText size={40} strokeWidth={1.2} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Report ID', 'Generated At', 'Time Range', 'Events', 'Total Alerts', 'Security Score', 'Actions'].map((h) => (
                    <th key={h} className="table-header text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className="border-b border-subtle hover:bg-subtle/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-accent-cyan">{r.id}</td>
                    <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">{fmtDate(r.generated_at)}</td>
                    <td className="px-4 py-3 text-text-primary">{r.time_range_hours}h</td>
                    <td className="px-4 py-3 text-text-primary">{r.total_events ?? '—'}</td>
                    <td className="px-4 py-3 text-text-primary">{r.total_alerts ?? '—'}</td>
                    <td className="px-4 py-3">
                      {r.security_score != null
                        ? <span className="font-semibold text-accent-cyan">{r.security_score}</span>
                        : '—'}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedId(r.id)}
                        className="text-xs text-accent-cyan hover:text-cyan-300 font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ReportDetailModal
        reportId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
