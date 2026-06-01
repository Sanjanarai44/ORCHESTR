import React, { useEffect, useState } from "react";
import { participantsApi, teamsApi, scoresApi } from "../../api";

export default function StatsGrid({ eventConfig, eventId = 1 }) {
  const [pCount, setPCount] = useState("—");
  const [tCount, setTCount] = useState("—");
  const [pendingEval, setPendingEval] = useState("—");
  const judgeCount = eventConfig?.num_judges ?? "—";

  useEffect(() => {
    participantsApi.getAll(eventId)
      .then(res => setPCount((res?.participants || []).length))
      .catch(() => setPCount("?"));

    teamsApi.getAll(eventId).then(async res => {
      const teams = res?.teams || [];
      setTCount(teams.length);
      let pending = 0;
      for (const t of teams) {
        try {
          const s = await scoresApi.getByTeam(t.id);
          if ((s.scores || []).length === 0) pending++;
        } catch { pending++; }
      }
      setPendingEval(pending);
    }).catch(() => {});
  }, [eventId]);

  const stats = [
    { title: "Participants", value: pCount, icon: "person_add", color: "text-[#1B4332]", bg: "bg-[#1B4332]/5", extra: "Live count" },
    { title: eventConfig?.team_size ? `Teams (${eventConfig.team_size}/team)` : "Formed Teams", value: tCount, icon: "groups", color: "text-[#1B4332]", bg: "bg-[#1B4332]/5", extra: "From DB" },
    { title: "Active Judges", value: judgeCount, icon: "gavel", color: "text-[#1B4332]", bg: "bg-[#1B4332]/5", extra: "Configured" },
    { title: "Awaiting Scores", value: pendingEval, icon: "pending_actions", color: "text-red-600", bg: "bg-red-50", extra: "Teams unscored" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((item, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-[#1B4332]/10 p-6 flex flex-col justify-between hover:shadow-md transition-all">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className={`p-2 rounded-lg ${item.bg} ${item.color} material-symbols-outlined`}>{item.icon}</span>
              <span className="text-[10px] font-bold uppercase text-gray-400">{item.extra}</span>
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">{item.title}</p>
            <h3 className={`text-4xl font-bold tracking-tight ${item.color}`}>{item.value}</h3>
          </div>
          <div className="mt-4 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#1B4332] w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}