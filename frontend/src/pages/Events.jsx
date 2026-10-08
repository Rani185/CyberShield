import React, { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { getEvents, getEvent } from '../api/events.js';
import { usePolling } from '../hooks/usePolling.js';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Table from '../components/ui/Table.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import Modal from '../components/ui/Modal.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';

const SEVERITIES = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const STATUSES   = ['ALL', 'NORMAL', 'SUSPICIOUS', 'MALICIOUS'];
const PAGE_SIZE  = 25;

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ─── Event Detail Modal ────────────────────────────────────────────────────────

function EventDetailModal({ eventId, onClose }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    getEvent(eventId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  return (
    <Modal isOpen={!!eventId} onClose={onClose} title="Event Details" size="lg">
      {loading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}
      {error && <ErrorState message={error} />}
      {data && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Badge severity={data.severity} />
            <span className="text-xs text-text-muted font-mono">ID: {data.id}</span>
          </div>

          {/* Core Fields */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {[
              ['Timestamp',   fmtDate(data.timestamp)],
              ['Event Type',  data.event_type],
              ['Source IP',   data.source_ip],
              ['Destination', data.destination],
              ['Username',    data.username],
              ['Category',    data.category],
              ['Severity',    data.severity],
              ['Status',      data.status],
              ['Message',     data.message],
            ].map(([label, val]) => val ? (
              <div key={label}>
                <span className="text-text-muted">{label}: </span>
                <span className="text-text-primary font-medium">{val}</span>
              </div>
            ) : null)}
          </div>

          {/* Raw payload (if present) */}
          {data.raw_data && (
            <section>
              <p className="section-label mb-2">Raw Payload</p>
              <pre className="bg-navy text-xs text-text-muted rounded-lg p-3 overflow-auto max-h-40">
                {typeof data.raw_data === 'string'
                  ? data.raw_data
                  : JSON.stringify(data.raw_data, null, 2)}
              </pre>
            </section>
          )}

          {/* Related Alerts */}
          {data.related_alerts && data.related_alerts.length > 0 && (
            <section>
              <p className="section-label mb-2">Related Alerts ({data.related_alerts.length})</p>
              <div className="space-y-2">
                {data.related_alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between bg-navy rounded-lg px-3 py-2 text-sm">
                    <span className="text-text-muted font-mono text-xs">{alert.id}</span>
                    <span>{alert.title}</span>
                    <Badge severity={alert.severity} />
                    <Badge status={alert.status} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Events() {
  const [events, setEvents]     = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');
  const [severity, setSeverity] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus]     = useState('ALL');
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
      const res = await getEvents(params);
      const list = res?.events || res?.data || res || [];
      setEvents(list);
      setTotal(res?.total || list.length);
      const cats = ['ALL', ...new Set(list.map((e) => e.category).filter(Boolean))];
      setCategories((prev) => prev.length > 1 ? prev : cats);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, severity, category, status]);

  usePolling(load, 10000, true);
  useEffect(() => { setPage(1); }, [search, severity, category, status]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const columns = [
    {
      key: 'timestamp',
      label: 'Timestamp',
      render: (v) => <span className="text-xs text-text-muted whitespace-nowrap">{fmtDate(v)}</span>,
    },
    { key: 'event_type',  label: 'Type',        render: (v) => <span className="text-sm">{v}</span> },
    { key: 'source_ip',   label: 'Source IP',   render: (v) => <span className="font-mono text-xs">{v || '—'}</span> },
    { key: 'destination', label: 'Destination', render: (v) => <span className="font-mono text-xs">{v || '—'}</span> },
    { key: 'username',        label: 'Username',    render: (v) => <span className="text-xs">{v || '—'}</span> },
    { key: 'category',        label: 'Category',    render: (v) => <span className="text-xs text-text-muted">{v || '—'}</span> },
    { key: 'severity',        label: 'Severity',    render: (v) => v ? <Badge severity={v} /> : '—' },
    { key: 'status',          label: 'Status',      render: (v) => v ? <Badge status={v} /> : '—' },
  ];

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search events..."
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
        {loading && events.length === 0 ? (
          <Skeleton variant="table-row" count={10} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <>
            <Table
              columns={columns}
              data={events}
              keyField="id"
              onRowClick={(row) => setSelectedId(row.id)}
              emptyMessage="No events match the current filters"
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

      <EventDetailModal
        eventId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
