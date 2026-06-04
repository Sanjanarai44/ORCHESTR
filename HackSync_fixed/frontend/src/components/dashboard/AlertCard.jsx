import React, { useState, useEffect } from "react";
import { teamsApi, scoresApi, aiApi } from "../../api";

function AlertCard({ eventId }) {
  const [anomaly, setAnomaly] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [cleared, setCleared] = useState(false);

  // on mount: scan all teams for score anomalies
  useEffect(() => {
    const detect = async () => {
  if (!eventId) return;
  try {
    const res = await teamsApi.getAll(eventId);
        const teams = res.teams || res || [];

        for (const team of teams) {
          const scoreRes = await scoresApi.getByTeam(team.id);
          const { anomalies = [], average = 0 } = scoreRes;

          if (anomalies.length > 0) {
            const a = anomalies[0];
            setAnomaly({
              team_name: team.name,
              judge_name: a.judge_name,
              judge_score: a.score,
              panel_average: average,
            });
            return; // show first detected anomaly
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    detect();
  }, []);

  const handleInvestigate = async () => {
    if (!anomaly) return;
    setLoading(true);
    setExplanation("");
    try {
    const data = await aiApi.explainAnomaly({
      team_name: anomaly.team_name,
      judge_name: anomaly.judge_name,
      judge_score: anomaly.judge_score,
      panel_average: anomaly.panel_average,
      threshold: 2.0,
    });
      setExplanation(data.explanation || "");
    } catch (err) {
      setExplanation("Failed to fetch explanation.");
    }
    setLoading(false);
  };

  if (cleared || !anomaly) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-red-200 border-l-4 border-l-red-500 p-6 relative overflow-hidden">

      <div className="absolute -right-4 -top-4 opacity-5 rotate-12">
        <span className="material-symbols-outlined text-[100px] text-red-500">
          security
        </span>
      </div>

      <h3 className="text-xs font-bold text-red-600 uppercase flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-sm">warning</span>
        Pattern Anomaly Detected
      </h3>

      <p className="text-xs text-gray-600 leading-relaxed mb-2">
        <strong>{anomaly.judge_name}</strong> scored{" "}
        <strong>{anomaly.judge_score}/10</strong> for{" "}
        <strong>{anomaly.team_name}</strong> — panel average is{" "}
        <strong>{Number(anomaly.panel_average).toFixed(1)}</strong>.
      </p>

      {explanation && (
        <p className="text-xs text-gray-500 leading-relaxed mb-4 bg-red-50 border border-red-100 rounded-lg p-3">
          {explanation}
        </p>
      )}

      <div className="flex gap-3 mt-4">
        <button
          onClick={handleInvestigate}
          disabled={loading}
          className="flex-1 bg-red-50 border border-red-200 py-2.5 rounded-lg text-[10px] font-bold text-red-600 uppercase"
        >
          {loading ? "Loading..." : explanation ? "Re-Investigate" : "Investigate"}
        </button>

        <button
          onClick={() => setCleared(true)}
          className="flex-1 bg-gray-50 border border-gray-200 py-2.5 rounded-lg text-[10px] font-bold text-gray-600 uppercase"
        >
          Clear
        </button>
      </div>

    </div>
  );
}

export default AlertCard;
