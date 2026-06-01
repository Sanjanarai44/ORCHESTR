import React, { useEffect, useState } from 'react';
import { activityApi } from '../../api';

export default function ActivityAndMentors() {

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await activityApi.getLog();
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
  }, []);

  return (
    <div className="space-y-6">

      {/* RECENT ACTIVITY */}
      <div className="bg-white rounded-2xl border border-[#cbe8eb] p-6">

        <h3 className="text-xl font-bold text-[#012d1d] mb-4">
          Recent Activity
        </h3>

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : (
          <div className="space-y-4">

            {logs.length === 0 && (
              <p className="text-sm text-gray-500">
                No activity yet
              </p>
            )}

            {logs.map((log, i) => (
              <div
                key={i}
                className="flex items-start gap-3 border-b border-gray-100 pb-3"
              >
                <span className="w-2 h-2 mt-2 rounded-full bg-green-500"></span>

                <div>
                  <p className="text-sm text-[#012d1d] font-medium">
                    {log.action}
                  </p>
                  <p className="text-xs text-gray-500">
                    {log.details}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {log.created_at || "Just now"}
                  </p>
                </div>
              </div>
            ))}

          </div>
        )}

      </div>

    </div>
  );
}
