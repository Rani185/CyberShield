import React, { useState, useEffect, useCallback } from 'react';
import { Search, Eye, CheckCircle } from 'lucide-react';
import { getAlerts, getAlert, investigateAlert, resolveAlert } from '../api/alerts.js';
import { usePolling } from '../hooks/usePolling.js';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Table from '../components/ui/Table.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import Modal from '../components/ui/Modal.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { toastSuccess, toastError } from '../components/ui/Toast.jsx';

const SEVERITIES = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const STATUSES   = ['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED'];
const PAGE_SIZE  = 20;

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Alert Detail Modal ────────────────────────────────────────────────────────

function AlertDetailModal({ alertId, onClose, onStatusChanged }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [notes, setNotes]     = useState('');
  const [acting, setActing]   = useState(false);

  useEffect(() => {
    if (!alertId) return;
    setLoading(true);
    setError(null);
    getAlert(alertId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [alertId]);

  async function handleInvestigate() {
    setActing(true);
    try {
      await investigateAlert(alertId, notes);
      toastSuccess('Alert marked as investigating');
      onStatusChanged();
      onClose();
    } catch (e) {
      toastError(e.message);
    } finally {
      setActing(false);
    }
  }

  async function handleResolve() {
    setActing(true);
    try {
      await resolveAlert(alertId);
      toastSuccess('Alert resolved');
      onStatusChanged();
      onClose();
    } catch (e) {
      toastError(e.message);
    } finally {
      setActing(false);
    }
  }

  return (
    <Modal isOpen={!!alertId} onClose={onClose} title="Alert Details" size="lg">
      {loading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}
      {error && <ErrorState message={error} onRetry={() => setLoading(true)} />}
      {data && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge severity={data.severity} />
                <Badge status={data.status} />
              </div>
              <h2 className="text-base font-semibold text-text-primary">{data.title}</h2>
              <p className="text-xs text-text-muted mt-1">ID: {data.id} · {fmtDate(data.created_at)}</p>
            </div>
          </div>

          {/* Description */}
          {data.description && (
            <section>
              <p className="section-label mb-1">Description</p>
              <p className="text-sm text-text-muted leading-relaxed">{data.description}</p>
            </section>
          )}

          {/* Rule Details */}
          {data.rule && (
            <section className="bg-navy rounded-lg p-4 space-y-1">
              <p className="section-label mb-2">Detection Rule</p>
              <p className="text-sm"><span className="text-text-muted">Rule ID:</span> <span className="font-mono text-accent-cyan">{data.rule.rule_id}</span></p>
              <p className="text-sm"><span className="text-text-muted">Name:</span> {data.rule.name}</p>
              {data.rule.description && <p className="text-sm text-text-muted">{data.rule.description}</p>}
              {data.rule.threshold != null && <p className="text-sm"><span className="text-text-muted">Threshold:</span> {data.rule.threshold}</p>}
            </section>
          )}

          {/* Risk Assessment */}
          {(data.risk_score != null || data.risk_level) && (
            <section className="bg-navy rounded-lg p-4 space-y-1">
              <p className="section-label mb-2">Risk Assessment</p>
              {data.risk_score != null && <p className="text-sm"><span className="text-text-muted">Risk Score:</span> <span className="font-semibold text-text-primary">{data.risk_score}</span></p>}
              {data.risk_level && <p className="text-sm"><span className="text-text-muted">Risk Level:</span> <Badge severity={data.risk_level} /></p>}
            </section>
          )}

          {/* Recommended Action */}
          {data.recommended_action && (
            <section>
              <p className="section-label mb-1">Recommended Action</p>
              <p className="text-sm text-text-muted">{data.recommended_action}</p>
            </section>
          )}

          {/* Related Events */}
          {data.related_events && data.related_events.length > 0 && (
            <section>
              <p className="section-label mb-2">Related Events ({data.related_events.length})</p>
              <div className="overflow-x-auto rounded-lg border border-subtle">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-subtle bg-navy">
                      <th className="px-3 py-2 text-left text-text-muted">Time</th>
                      <th className="px-3 py-2 text-left text-text-muted">Type</th>
                      <th className="px-3 py-2 text-left text-text-muted">Source IP</th>
                      <th className="px-3 py-2 text-left text-text-muted">User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.related_events.map((ev) => (
                      <tr key={ev.id} className="border-b border-subtle last:border-0">
                        <td className="px-3 py-2 text-text-muted">{fmtDate(ev.timestamp)}</td>
                        <td className="px-3 py-2 text-text-primary">{ev.event_type}</td>
                        <td className="px-3 py-2 font-mono">{ev.source_ip || '—'}</td>
                        <td className="px-3 py-2">{ev.username || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Investigation Notes (shown if status is INVESTIGATING) */}
          {(data.status === 'INVESTIGATING' && data.notes) && (
            <section>
              <p className="section-label mb-1">Investigation Notes</p>
              <p className="text-sm text-text-muted bg-navy rounded-lg p-3">{data.notes}</p>
            </section>
          )}

          {/* Actions */}
          {data.status !== 'RESOLVED' && (
            <section className="space-y-3 pt-2">
              {data.status === 'OPEN' && (
                <div>
                  <p className="section-label mb-2">Investigation Notes</p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes before marking as investigating..."
                    className="input-field h-20 resize-none"
                  />
                </div>
              )}
              <div className="flex items-center gap-3">
                {data.status === 'OPEN' && (
                  <button onClick={handleInvestigate} disabled={acting} className="btn-secondary flex items-center gap-1.5">
                    <Eye size={14} />
                    {acting ? 'Saving…' : 'Investigate'}
                  </button>
                )}
                <button onClick={handleResolve} disabled={acting} className="btn-primary flex items-center gap-1.5">
                  <CheckCircle size={14} />
                  {acting ? 'Resolving…' : 'Resolve'}
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Alerts() {
  const [alerts, setAlerts]       = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState('');
  const [severity, setSeverity]   = useState('ALL');
  const [category, setCategory]   = useState('ALL');
  const [status, setStatus]       = useState('ALL');
  const [categories, setCategories] = useState(['ALL']);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    try {
      const params = {
        page, limit: PAGE_SIZE,
        ...(search   ? { search }   : {}),
        ...(severity !== 'ALL' ? { severity } : {}),
        ...(category !== 'ALL' ? { category } : {}),
        ...(status   !== 'ALL' ? { status }   : {}),
      };
      const res = await getAlerts(params);
      const list = res?.alerts || res?.data || res || [];
      setAlerts(list);
      setTotal(res?.total || list.length);
      // Collect unique categories
      const cats = ['ALL', ...new Set(list.map((a) => a.category).filter(Boolean))];
      setCategories((prev) => prev.length > 1 ? prev : cats);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, severity, category, status]);

  usePolling(load, 15000, true);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, severity, category, status]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const columns = [
    { key: 'id',        label: 'ID',        render: (v) => <span className="text-text-muted text-xs font-mono">{v}</span> },
    { key: 'severity',  label: 'Severity',  render: (v) => <Badge severity={v} /> },
    { key: 'title',     label: 'Title',     render: (v) => <span className="font-medium">{v}</span> },
    { key: 'category',  label: 'Category',  render: (v) => <span className="text-text-muted text-xs">{v}</span> },
    { key: 'source_ip', label: 'Source IP', render: (v) => <span className="font-mono text-xs">{v || '—'}</span> },
    { key: 'status',    label: 'Status',    render: (v) => <Badge status={v} /> },
    { key: 'created_at',label: 'Created',   render: (v) => <span className="text-xs text-text-muted">{fmtDate(v)}</span> },
    {
      key: '_actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {row.status !== 'RESOLVED' && (
            <>
              {row.status === 'OPEN' && (
                <button
                  className="text-xs text-yellow-400 hover:text-yellow-300 font-medium"
                  onClick={() => { setSelectedId(row.id); }}
                >
                  Investigate
                </button>
              )}
              <button
                className="text-xs text-green-400 hover:text-green-300 font-medium"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await resolveAlert(row.id);
                    toastSuccess('Alert resolved');
                    load();
                  } catch (err) {
                    toastError(err.message);
                  }
                }}
              >
                Resolve
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search alerts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-8"
          />
        </div>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="select-field">
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="select-field">
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="select-field">
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-text-muted whitespace-nowrap">{total} results</span>
      </div>

      {/* Table */}
      <Card>
        {loading && alerts.length === 0 ? (
          <Skeleton variant="table-row" count={8} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <>
            <Table
              columns={columns}
              data={alerts}
              keyField="id"
              onRowClick={(row) => setSelectedId(row.id)}
              emptyMessage="No alerts match the current filters"
            />
            <Pagination
              page={page}
              totalPages={totalPages}
              onPage={setPage}
              totalItems={total}
              limit={PAGE_SIZE}
            />
          </>
        )}
      </Card>

      {/* Detail modal */}
      <AlertDetailModal
        alertId={selectedId}
        onClose={() => setSelectedId(null)}
        onStatusChanged={load}
      />
    </div>
  );
}
