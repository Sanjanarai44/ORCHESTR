import React, { useCallback, useEffect, useRef, useState } from 'react';

const API = import.meta.env.VITE_JUDGE_API_URL || 'http://localhost:8001';
const WS_URL = API.replace(/^http/, 'ws') + '/ws/admin';

const STATUS_BADGE = {
  SENT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  FAILED: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
};

const TYPE_BADGE = {
  magic_link: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300',
  welcome: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  reminder: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
  results: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  anomaly_alert: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
};

const TYPE_LABEL = {
  magic_link: 'Magic Link',
  welcome: 'Welcome',
  reminder: 'Reminder',
  results: 'Results',
  anomaly_alert: 'Anomaly Alert',
};

/**
 * EmailLogTable — Admin component exported for T2 (Komalpreet).
 * Shows paginated email log with filters, retry button for FAILED emails.
 * Auto-refreshes every 30 seconds or on WebSocket update.
 *
 * Usage: import EmailLogTable from '../components/admin/EmailLogTable';
 */
export default function EmailLogTable() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [previewModal, setPreviewModal] = useState(null);
  const [retrying, setRetrying] = useState({});
  const wsRef = useRef(null);
  const refreshTimer = useRef(null);

  const LIMIT = 10;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: typeFilter,
        status: statusFilter,
        page: String(page),
        limit: String(LIMIT),
      });
      if (search) params.set('search', search);
      const res = await fetch(`${API}/api/admin/email-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch { /* non-critical */ } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, search, page]);

  // Initial load + auto-refresh
  useEffect(() => {
    fetchLogs();
    refreshTimer.current = setInterval(fetchLogs, 30000);
    return () => clearInterval(refreshTimer.current);
  }, [fetchLogs]);

  // WebSocket — refresh on email events
  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const { event: evtName } = JSON.parse(event.data);
        if (evtName === 'email:sent' || evtName === 'email:failed') {
          fetchLogs();
        }
      } catch { /* ignore */ }
    };
    return () => ws.close();
  }, [fetchLogs]);

  const handleRetry = async (logId) => {
    setRetrying((prev) => ({ ...prev, [logId]: true }));
    try {
      const res = await fetch(`${API}/api/admin/emails/${logId}/retry`, { method: 'POST' });
      if (!res.ok) throw new Error('Retry failed');
      await fetchLogs();
    } catch (err) {
      alert(`Retry error: ${err.message}`);
    } finally {
      setRetrying((prev) => ({ ...prev, [logId]: false }));
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          id="email-type-filter"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="text-xs font-semibold border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
        >
          <option value="all">All Types</option>
          <option value="magic_link">Magic Link</option>
          <option value="welcome">Welcome</option>
          <option value="reminder">Reminder</option>
          <option value="results">Results</option>
          <option value="anomaly_alert">Anomaly Alert</option>
        </select>

        <select
          id="email-status-filter"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-xs font-semibold border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
        >
          <option value="all">All Status</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>

        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-stone-400 text-[16px]">search</span>
          <input
            id="email-search"
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-xs border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          title="Refresh"
        >
          <span className={`material-symbols-outlined text-stone-400 text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left border-b border-stone-100 dark:border-stone-800 text-stone-400 font-bold uppercase tracking-wide">
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sent At</th>
                <th className="px-4 py-3">Attempts</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                    <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-400 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400">No email logs found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-stone-50 dark:border-stone-800/40 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-stone-900 dark:text-white">{log.recipientName || '—'}</p>
                      <p className="text-stone-400">{log.recipientEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wide ${TYPE_BADGE[log.emailType] || 'bg-stone-100 text-stone-600'}`}>
                        {TYPE_LABEL[log.emailType] || log.emailType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wide ${STATUS_BADGE[log.status] || ''}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {log.sentAt ? new Date(log.sentAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-stone-500 font-semibold">{log.attempts}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          id={`view-email-${log.id}`}
                          onClick={() => setPreviewModal(log)}
                          className="text-xs font-semibold text-stone-600 dark:text-stone-300 hover:underline"
                        >
                          View
                        </button>
                        {log.status === 'FAILED' && (
                          <button
                            id={`retry-email-${log.id}`}
                            onClick={() => handleRetry(log.id)}
                            disabled={retrying[log.id]}
                            className="text-xs font-bold text-red-600 hover:underline disabled:opacity-50"
                          >
                            {retrying[log.id] ? 'Retrying…' : 'Retry'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100 dark:border-stone-800">
            <span className="text-xs text-stone-400">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-xs font-semibold text-stone-600 dark:text-stone-300 disabled:opacity-30 hover:underline"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="text-xs font-semibold text-stone-600 dark:text-stone-300 disabled:opacity-30 hover:underline"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email preview modal */}
      {previewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800">
              <div>
                <p className="text-sm font-bold text-stone-900 dark:text-white">Email Preview</p>
                <p className="text-xs text-stone-500">{previewModal.recipientEmail}</p>
              </div>
              <button onClick={() => setPreviewModal(null)} className="material-symbols-outlined text-stone-400 hover:text-stone-600 transition-colors">close</button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-auto">
              <p className="text-xs font-semibold text-stone-500 mb-1">TYPE</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mb-4 ${TYPE_BADGE[previewModal.emailType] || ''}`}>
                {TYPE_LABEL[previewModal.emailType] || previewModal.emailType}
              </span>
              {previewModal.errorMessage && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-3 mb-4">
                  <p className="text-xs font-bold text-red-700 dark:text-red-400">Error</p>
                  <p className="text-xs text-red-600 dark:text-red-300">{previewModal.errorMessage}</p>
                </div>
              )}
              <div className="text-xs text-stone-500 space-y-1">
                <p><strong>Job ID:</strong> {previewModal.jobId || '—'}</p>
                <p><strong>Attempts:</strong> {previewModal.attempts}</p>
                <p><strong>Status:</strong> {previewModal.status}</p>
                <p><strong>Created:</strong> {new Date(previewModal.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
