import React, { useState, useCallback } from 'react';
import { AlertTriangle, Activity } from 'lucide-react';
import { getThreats } from '../api/threats.js';
import { usePolling } from '../hooks/usePolling.js';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

export default function Threats() {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await getThreats();
      const raw = Array.isArray(res) ? res : (res?.threats || res?.data || []);
      // Normalise field names
      const list = raw.map((t) => ({
        ...t,
        name: t.name || t.rule_name || t.rule_id || 'Unknown',
        active_alerts: t.active_alerts ?? t.open_alerts ?? 0,
        events_linked: t.events_linked ?? t.total_events ?? t.total_alerts ?? 0,
      }));
      setThreats(list);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(load, 15000, true);

  if (error && !threats.length) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          {loading ? '…' : `${threats.length} active threat rule${threats.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="card" />
          ))}
        </div>
      ) : threats.length === 0 ? (
        <EmptyState message="No active threats detected" sub="The system is monitoring all configured rules." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {threats.map((threat) => (
            <ThreatCard key={threat.id || threat.rule_id} threat={threat} />
          ))}
        </div>
      )}
    </div>
  );
}

function ThreatCard({ threat }) {
  return (
    <Card className="hover:border-accent-cyan/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-muted font-mono mb-1">{threat.rule_id || threat.id}</p>
          <h3 className="text-sm font-semibold text-text-primary truncate">{threat.name}</h3>
        </div>
        <Badge severity={threat.severity} />
      </div>

      {/* Category */}
      <div className="flex items-center gap-1.5 text-xs text-text-muted">
        <AlertTriangle size={12} />
        <span>{threat.category || 'Unknown'}</span>
      </div>

      {/* Description */}
      {threat.description && (
        <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
          {threat.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 pt-1 border-t border-subtle">
        <div className="flex items-center gap-1.5 text-xs">
          <AlertTriangle size={12} className="text-red-400" />
          <span className="text-text-muted">Active Alerts:</span>
          <span className="font-semibold text-text-primary">{threat.active_alerts ?? 0}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Activity size={12} className="text-accent-cyan" />
          <span className="text-text-muted">Events:</span>
          <span className="font-semibold text-text-primary">{threat.events_linked ?? threat.total_events ?? 0}</span>
        </div>
      </div>
    </Card>
  );
}
