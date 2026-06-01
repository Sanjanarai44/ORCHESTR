import React, { useState, useEffect } from 'react';

export default function EmailsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryingIds, setRetryingIds] = useState({});

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_JUDGE_API_URL || 'http://localhost:8001'}/api/admin/email-logs`);
      const data = await res.json();
      if (res.ok && data.success) {
        setLogs(data.logs);
      } else {
        setError(data.error || 'Failed to fetch email logs');
      }
    } catch (err) {
      setError('Network error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRetry = async (id) => {
    setRetryingIds(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`${import.meta.env.VITE_JUDGE_API_URL || 'http://localhost:8001'}/api/admin/emails/${id}/retry`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Optimistic update
        setLogs(logs.map(log => log.id === id ? { ...log, status: 'PENDING' } : log));
      } else {
        alert(data.message || 'Retry failed');
      }
    } catch (err) {
      alert('Network error during retry');
    }
    setRetryingIds(prev => ({ ...prev, [id]: false }));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SENT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-100 text-emerald-800">Sent</span>;
      case 'FAILED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-red-100 text-red-800">Failed</span>;
      case 'PENDING':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-100 text-amber-800">Pending</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto text-stone-800 dark:text-stone-200">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Email Logs</h2>
          <p className="text-sm text-stone-500">Track delivery status of all outbound emails.</p>
        </div>
        <button 
          onClick={fetchLogs}
          className="flex items-center gap-2 text-sm font-semibold hover:text-stone-600 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Refresh
        </button>
      </div>

      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/60 dark:border-stone-800/80 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-500">Loading logs...</div>
        ) : error ? (
          <div className="p-12 text-center text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 dark:bg-stone-800/40 text-stone-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Recipient</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Attempts</th>
                  <th className="px-6 py-4">Sent At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/40">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-stone-500">No email logs found.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-stone-900 dark:text-white">{log.recipientName || 'Unknown'}</div>
                        <div className="text-xs text-stone-500">{log.recipientEmail}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-stone-700 dark:text-stone-300">
                        {log.emailType.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="px-6 py-4 text-stone-500">
                        {log.attempts}
                      </td>
                      <td className="px-6 py-4 text-stone-500 text-xs">
                        {log.sentAt ? new Date(log.sentAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {log.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetry(log.id)}
                            disabled={retryingIds[log.id]}
                            className="text-xs font-bold text-stone-900 dark:text-white hover:underline disabled:opacity-50"
                          >
                            {retryingIds[log.id] ? 'Retrying...' : 'Retry'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
