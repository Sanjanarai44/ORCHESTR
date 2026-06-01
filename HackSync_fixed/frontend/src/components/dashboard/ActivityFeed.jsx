import React, { useEffect, useState } from "react";
import { activityApi } from "../../api";

function ActivityFeed({ eventId = 1 }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await activityApi.getLog(eventId);
        setLogs(res.logs || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [eventId]);

  const formatTime = (ts) => {
    if (!ts) return "Just now";
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const actionIcon = (action = '') => {
    if (action.includes('team')) return 'diversity_3';
    if (action.includes('score') || action.includes('eval')) return 'analytics';
    if (action.includes('participant') || action.includes('roster')) return 'person_add';
    if (action.includes('stage')) return 'arrow_forward';
    if (action.includes('approve')) return 'check_circle';
    if (action.includes('email')) return 'mark_email_read';
    return 'radio_button_checked';
  };

  return (
    <div className="bg-white rounded-xl border border-[#1B4332]/10 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-[#012d1d] uppercase tracking-widest">Activity Feed</h2>
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gray-400 py-4">
          <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      ) : logs.length === 0 ? (
        <div className="py-8 text-center">
          <span className="material-symbols-outlined text-gray-300 text-3xl block mb-2">history</span>
          <p className="text-xs text-gray-400">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.slice(0, 8).map((log) => (
            <div key={log.id} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#1B4332]/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[#1B4332] text-[12px]">{actionIcon(log.action)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#012d1d] leading-relaxed">{log.details}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{formatTime(log.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ActivityFeed;