// components/participant/ParticipantLeaderboard.jsx
import React, { useEffect, useState } from "react";
import { teamsApi, scoresApi, judgesApi } from "../../api";

export default function ParticipantLeaderboard({ eventId = 1, currentTeamId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allScored, setAllScored] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await teamsApi.getAll(eventId);
        const teams = res?.teams || [];

        const judgesRes = await judgesApi.getAll(eventId);
        const totalJudges = (judgesRes?.judges || judgesRes || []).length;

        const withScores = await Promise.all(
          teams.map(async (team) => {
            try {
              const s = await scoresApi.getByTeam(team.id);
              return {
                id: team.id,
                name: team.name,
                average: s.average ? Number(s.average).toFixed(1) : null,
                scoresCount: (s.scores || []).length,
              };
            } catch {
              return { id: team.id, name: team.name, average: null, scoresCount: 0 };
            }
          })
        );

        withScores.sort((a, b) => {
          const av = parseFloat(a.average) || -1;
          const bv = parseFloat(b.average) || -1;
          return bv - av;
        });

        withScores.forEach((r, i) => { r.rank = i + 1; });
        setRows(withScores);

        const complete = totalJudges > 0 && withScores.every(t => t.scoresCount >= totalJudges);
        setAllScored(complete);
      } catch {}
      setLoading(false);
    };
    load();
  }, [eventId]);

  return (
    <div className="bg-white rounded-2xl border border-[#c1c8c2]/30 p-6 shadow-sm">
      <h2 className="text-lg font-bold text-[#012d1d] mb-4">Leaderboard</h2>

      {loading ? (
        <div className="py-8 text-center text-gray-400 text-sm">Loading standings…</div>
      ) : !allScored ? (
        <div className="py-8 text-center text-gray-400 text-sm">
          Standings will appear here once all judges have submitted their evaluations.
        </div>
      ) : (
        <>
          
          <div className="space-y-2">
            {rows.map((team) => {
              const isMine = team.id === currentTeamId;
              return (
                <div
                  key={team.id}
                  className={`flex items-center px-4 py-3 rounded-xl ${
                    isMine ? "bg-[#c1ecd4] ring-2 ring-[#012d1d]" : "bg-[#f5f9f7]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
  team.rank === 1 ? "bg-[#f4c542] text-[#012d1d]" : "bg-[#012d1d] text-white"
}`}>
  {team.rank}
</span>
                    <span className="text-sm font-semibold text-[#031f22]">
                      {team.name}
                      {isMine && <span className="ml-2 text-xs text-[#012d1d]/70">(Your Team)</span>}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}