import React, { useState, useEffect } from "react";
import { stageApi } from "../../api";

function stageIcon(name = "") {
  const n = name.toLowerCase();
  if (n.includes("registr") || n.includes("roster") || n.includes("intake")) return "how_to_reg";
  if (n.includes("team") || n.includes("form") || n.includes("group")) return "diversity_3";
  if (n.includes("hack") || n.includes("build") || n.includes("develop") || n.includes("code")) return "code";
  if (n.includes("evaluat") || n.includes("review") || n.includes("round") || n.includes("judg")) return "analytics";
  if (n.includes("final") || n.includes("demo") || n.includes("present")) return "workspace_premium";
  if (n.includes("winner") || n.includes("award") || n.includes("result") || n.includes("close")) return "stars";
  if (n.includes("brief") || n.includes("kickoff") || n.includes("welcome")) return "celebration";
  return "fiber_manual_record";
}

const DEFAULT_STAGES = ["Registration", "Team Formation", "Evaluation", "Final Demo", "Results"];
// Maps stage index to DB stage key
const STAGE_KEYS = ["roster", "development", "evaluation", "demo", "final"];

export default function WorkflowTracker({ eventConfig, eventId = 1 }) {
  const rawStages = eventConfig?.stages?.length > 0 ? eventConfig.stages : DEFAULT_STAGES;
  const eventName = eventConfig?.event_name || "Event";
  const eventType = eventConfig?.event_type || "hackathon";

  const [activeIndex, setActiveIndex] = useState(0);
  const [advancing, setAdvancing] = useState(false);
  const [stageCounts, setStageCounts] = useState({});

  // Load current stage distribution from DB
  useEffect(() => {
    stageApi.getStages(eventId)
      .then(res => {
        const map = {};
        (res.stages || []).forEach(s => { map[s.stage] = s.count; });
        setStageCounts(map);
        // Set active index to the most populated stage
        const keys = STAGE_KEYS;
        let maxIdx = 0;
        keys.forEach((k, i) => { if ((map[k] || 0) > (map[keys[maxIdx]] || 0)) maxIdx = i; });
        setActiveIndex(Math.min(maxIdx, rawStages.length - 1));
      })
      .catch(() => {});
  }, []);

  const handleAdvance = async () => {
    if (activeIndex >= rawStages.length - 1) return;
    const fromKey = STAGE_KEYS[activeIndex] || STAGE_KEYS[0];
    const toKey = STAGE_KEYS[activeIndex + 1] || STAGE_KEYS[activeIndex];
    const fromName = rawStages[activeIndex];
    const toName = rawStages[activeIndex + 1];
    if (!confirm(`Advance all participants from "${fromName}" → "${toName}"?\n\nThis updates every participant's stage in the database.`)) return;
    setAdvancing(true);
    try {
      const res = await stageApi.advanceStage(fromKey, toKey,eventId);
      alert(`✅ ${res.affected} participant${res.affected !== 1 ? 's' : ''} advanced to ${toName}`);
      setActiveIndex(i => Math.min(i + 1, rawStages.length - 1));
      // Refresh stage counts
      const updated = await stageApi.getStages(eventId);
      const map = {};
      (updated.stages || []).forEach(s => { map[s.stage] = s.count; });
      setStageCounts(map);
    } catch {
      alert("❌ Stage advance failed.");
    } finally {
      setAdvancing(false);
    }
  };

  const progressPct = rawStages.length > 1
    ? Math.round((activeIndex / (rawStages.length - 1)) * 100)
    : 0;

  const stages = rawStages.map((name, i) => ({
    name,
    icon: stageIcon(name),
    status: i < activeIndex ? "done" : i === activeIndex ? "active" : "pending",
    count: stageCounts[STAGE_KEYS[i]] || 0,
  }));

  const totalParticipants = Object.values(stageCounts).reduce((s, v) => s + v, 0);

  return (
    <section className="bg-white rounded-xl shadow-sm border border-[#1B4332]/10 p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-black flex items-center gap-3">
            <span className="material-symbols-outlined text-[#1B4332]">analytics</span>
            {eventName} — Event Pipeline
          </h2>
          <p className="text-xs text-gray-400 mt-1">{totalParticipants} participants tracked · {progressPct}% complete</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-[#9aa5ae] font-bold">{eventType}</span>
          <span className="bg-[#1B4332]/5 text-[#1B4332] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-[#1B4332]/20">
            {stages[activeIndex]?.name || '—'}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 rounded-full mb-8 overflow-hidden">
        <div className="h-full bg-[#1B4332] rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Stage nodes */}
      <div className="relative flex justify-between px-2 overflow-x-auto pb-2">
        <div className="absolute top-6 left-4 right-4 h-[2px] bg-gray-200 -z-10" />
        <div className="absolute top-6 left-4 h-[2px] bg-[#1B4332] -z-10 transition-all duration-700"
          style={{ width: `calc(${progressPct}% - 8px)` }} />

        {stages.map((stage, i) => {
          const isDone = stage.status === "done";
          const isActive = stage.status === "active";
          return (
            <button key={i} onClick={() => setActiveIndex(i)}
              className={`flex flex-col items-center gap-2 flex-shrink-0 px-2 transition-all duration-200 ${isActive ? "scale-110" : isDone ? "opacity-90" : "opacity-40"}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                isDone ? "bg-[#1B4332] border-[#1B4332] text-white" :
                isActive ? "bg-[#1B4332] border-[#1B4332] text-white shadow-lg shadow-[#1B4332]/30" :
                "bg-white border-gray-200 text-gray-400"
              }`}>
                {isDone
                  ? <span className="material-symbols-outlined text-[18px]">check</span>
                  : <span className="material-symbols-outlined text-[20px]">{stage.icon}</span>}
              </div>
              <span className={`text-[9px] font-bold uppercase text-center leading-tight max-w-[72px] ${isActive ? "text-[#1B4332]" : isDone ? "text-gray-600" : "text-gray-400"}`}>
                {stage.name}
              </span>
              {stage.count > 0 && (
                <span className="text-[9px] text-gray-400">{stage.count} here</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Advance stage control */}
      <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-100">
        <div>
          <p className="text-xs text-[#9aa5ae]">
            Stage <span className="font-bold text-[#1B4332]">{activeIndex + 1}</span> of{" "}
            <span className="font-bold text-[#1B4332]">{stages.length}</span>
          </p>
          <p className="text-[10px] text-[#9aa5ae] mt-0.5">
            Click a stage to view · Click Advance to move all participants forward
          </p>
        </div>
        <button
          onClick={handleAdvance}
          disabled={advancing || activeIndex >= rawStages.length - 1}
          className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#14532d] disabled:opacity-40 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
        >
          {advancing
            ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <span className="material-symbols-outlined text-[16px]">arrow_forward</span>}
          {advancing ? "Advancing..." : `Advance to ${rawStages[activeIndex + 1] || 'End'}`}
        </button>
      </div>
    </section>
  );
}
