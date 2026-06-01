import React, { useEffect, useState } from "react";
import { teamsApi, scoresApi } from "../../api";
 
export default function LeaderboardTable({ eventConfig, eventId = 1 }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const criteria = eventConfig?.scoring_criteria || ["Score"];
  const advancementRule = eventConfig?.advancement_rule || "";
 
  useEffect(() => {
    const load = async () => {
      try {
        const res = await teamsApi.getAll(eventId);
        const teams = res?.teams || [];
        const withScores = await Promise.all(
          teams.map(async (team, i) => {
            try {
              const s = await scoresApi.getByTeam(team.id);
              return {
                rank: i + 1,
                name: team.name,
                members: (team.members || []).map((m) => m.name).join(", "),
                average: s.average ? Number(s.average).toFixed(1) : "—",
                hasAnomaly: (s.anomalies || []).length > 0,
                status: s.average >= 8 ? "Qualifies" : s.average >= 5 ? "Reviewed" : "Pending",
              };
            } catch {
              return { rank: i + 1, name: team.name, members: "", average: "—", hasAnomaly: false, status: "Pending" };
            }
          })
        );
        // Sort by average desc
        withScores.sort((a, b) => {
          const av = parseFloat(a.average) || 0;
          const bv = parseFloat(b.average) || 0;
          return bv - av;
        });
        withScores.forEach((r, i) => { r.rank = i + 1; });
        setRows(withScores);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);
 
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#1B4332]/10 overflow-hidden">
      <div className="p-6 flex justify-between items-center border-b border-gray-100">
        <div>
          <h2 className="font-bold text-black">Live Competition Standings</h2>
          {advancementRule && (
            <p className="text-[10px] text-[#1B4332] font-semibold mt-0.5 uppercase tracking-widest">{advancementRule}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50">Export</button>
          <button onClick={() => window.location.reload()} className="bg-[#1B4332] text-white px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90">Refresh</button>
        </div>
      </div>
 
      {loading ? (
        <div className="p-12 text-center text-gray-400 text-sm">Loading standings…</div>
      ) : rows.length === 0 ? (
        <div className="p-12 text-center text-gray-400 text-sm">
          No teams scored yet. Judges need to submit evaluations first.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#F5F3F0] text-[10px] font-bold uppercase text-gray-500 tracking-widest">
              <tr>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Team</th>
                <th className="px-6 py-4">Members</th>
                <th className="px-6 py-4">Avg Score</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((team) => (
                <tr key={team.rank} className="hover:bg-[#1B4332]/5 transition-all">
                  <td className="px-6 py-4">
                    <div className="w-8 h-8 rounded-full bg-[#1B4332]/5 flex items-center justify-center text-[#1B4332] font-bold text-xs border border-[#1B4332]/20">
                      {team.rank}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{team.name}</span>
                      {team.hasAnomaly && (
                        <span className="material-symbols-outlined text-red-500 text-[14px]" title="Score anomaly">warning</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">{team.members || "—"}</td>
                  <td className="px-6 py-4 font-bold text-[#1B4332]">{team.average}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase ${
                      team.status === "Qualifies" ? "text-green-600" :
                      team.status === "Pending" ? "text-orange-500" : "text-gray-500"
                    }`}>
                      {team.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}