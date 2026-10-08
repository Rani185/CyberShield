import React, { useState, useCallback } from 'react';
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { getRules, updateRule, createRule } from '../api/rules.js';
import { usePolling } from '../hooks/usePolling.js';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { toastSuccess, toastError } from '../components/ui/Toast.jsx';

const SEVERITIES_OPT = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const CATEGORIES_OPT = ['Authentication', 'Authorization', 'Network', 'System', 'Data', 'Other'];

const BLANK_RULE = {
  rule_id: '', name: '', description: '', category: '',
  severity: 'MEDIUM', threshold: 1,
};

// ─── Add Rule Modal ────────────────────────────────────────────────────────────

function AddRuleModal({ isOpen, onClose, onCreated }) {
  const [form, setForm]     = useState(BLANK_RULE);
  const [saving, setSaving] = useState(false);

  function field(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await createRule({ ...form, threshold: Number(form.threshold) });
      toastSuccess('Rule created successfully');
      setForm(BLANK_RULE);
      onCreated();
      onClose();
    } catch (err) {
      toastError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Detection Rule" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="section-label block mb-1">Rule ID</label>
            <input required value={form.rule_id} onChange={field('rule_id')} placeholder="e.g. AUTH-005" className="input-field" />
          </div>
          <div>
            <label className="section-label block mb-1">Name</label>
            <input required value={form.name} onChange={field('name')} placeholder="Rule name" className="input-field" />
          </div>
        </div>

        <div>
          <label className="section-label block mb-1">Description</label>
          <textarea value={form.description} onChange={field('description')} placeholder="Rule description…" className="input-field h-20 resize-none" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="section-label block mb-1">Category</label>
            <select value={form.category} onChange={field('category')} className="select-field w-full">
              <option value="">Select…</option>
              {CATEGORIES_OPT.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="section-label block mb-1">Severity</label>
            <select value={form.severity} onChange={field('severity')} className="select-field w-full">
              {SEVERITIES_OPT.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="section-label block mb-1">Threshold</label>
            <input
              type="number" min="1" required
              value={form.threshold} onChange={field('threshold')}
              className="input-field"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Creating…' : 'Create Rule'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Rules() {
  const [rules, setRules]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [addOpen, setAddOpen]   = useState(false);
  const [toggling, setToggling] = useState(null); // rule id being toggled

  const load = useCallback(async () => {
    try {
      const res = await getRules();
      const list = res?.rules || res?.data || res || [];
      setRules(Array.isArray(list) ? list : []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(load, 30000, true);

  async function handleToggle(rule) {
    setToggling(rule.id);
    try {
      await updateRule(rule.id, { enabled: !rule.enabled });
      toastSuccess(`Rule ${rule.enabled ? 'disabled' : 'enabled'}`);
      load();
    } catch (err) {
      toastError(err.message);
    } finally {
      setToggling(null);
    }
  }

  if (error && !rules.length) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          {loading ? '…' : `${rules.length} rule${rules.length !== 1 ? 's' : ''} configured`}
        </p>
        <button onClick={() => setAddOpen(true)} className="btn-primary flex items-center gap-1.5">
          <Plus size={14} />
          Add Rule
        </button>
      </div>

      {/* Table */}
      <Card>
        {loading && rules.length === 0 ? (
          <Skeleton variant="table-row" count={6} />
        ) : rules.length === 0 ? (
          <EmptyState message="No detection rules configured" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Rule ID', 'Name', 'Category', 'Severity', 'Threshold', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="table-header text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} className="border-b border-subtle hover:bg-subtle/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-accent-cyan">{rule.rule_id}</td>
                    <td className="px-4 py-3 font-medium text-text-primary max-w-[200px] truncate">{rule.name}</td>
                    <td className="px-4 py-3 text-text-muted text-xs">{rule.category || '—'}</td>
                    <td className="px-4 py-3"><Badge severity={rule.severity} /></td>
                    <td className="px-4 py-3 text-text-primary">{rule.threshold ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge
                        status={rule.enabled ? 'ENABLED' : 'DISABLED'}
                        label={rule.enabled ? 'ENABLED' : 'DISABLED'}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {/* Toggle switch */}
                      <button
                        onClick={() => handleToggle(rule)}
                        disabled={toggling === rule.id}
                        className="flex items-center gap-1.5 text-xs hover:text-accent-cyan transition-colors disabled:opacity-50"
                        title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                      >
                        {toggling === rule.id ? (
                          <span className="w-4 h-4 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
                        ) : rule.enabled ? (
                          <ToggleRight size={20} className="text-green-400" />
                        ) : (
                          <ToggleLeft size={20} className="text-text-muted" />
                        )}
                        <span className="text-text-muted">Toggle</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddRuleModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={load}
      />
    </div>
  );
}
