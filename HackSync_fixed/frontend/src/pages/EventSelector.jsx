import React, { useState, useEffect } from "react";

function EventCard({ event, onOpen, onDelete }) {
  const cfg = event.config || {};
  const stages = cfg.stages || [];
  const pct = stages.length > 0 ? Math.min(100, Math.round((event.participant_count / 10) * 10)) : 0;

  const typeColors = {
    hackathon: "bg-[#e8f5ef] text-[#012d1d] border-[#a5d0b9]",
    "case competition": "bg-blue-50 text-blue-800 border-blue-200",
    coding: "bg-purple-50 text-purple-800 border-purple-200",
    sports: "bg-orange-50 text-orange-800 border-orange-200",
  };
  const typeColor = typeColors[event.event_type?.toLowerCase()] || "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <div className="group bg-white rounded-2xl border border-[#E2DDD8] hover:border-[#012d1d]/30 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
      {/* Top accent */}
      <div className={`h-1.5 ${event.status === "active" ? "bg-[#012d1d]" : "bg-gray-300"}`} />

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-[#012d1d] text-lg leading-tight truncate">{event.name}</h3>
            <p className="text-xs text-[#5a6672] mt-0.5">
              {new Date(event.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize flex-shrink-0 ${typeColor}`}>
            {event.event_type}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { icon: "groups", label: "Participants", val: event.participant_count || 0 },
            { icon: "diversity_3", label: "Teams", val: event.team_count || 0 },
            { icon: "gavel", label: "Judges", val: cfg.num_judges || "—" },
            { icon: "flag", label: "Stages", val: stages.length || "—" },
          ].map((s, i) => (
            <div key={i} className="bg-[#F5F3F0] rounded-xl p-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#012d1d]/50 text-[16px]">{s.icon}</span>
              <div>
                <p className="text-[10px] text-[#5a6672] font-medium">{s.label}</p>
                <p className="text-sm font-bold text-[#012d1d]">{s.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Scoring criteria */}
        {cfg.scoring_criteria?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {cfg.scoring_criteria.slice(0, 3).map((c, i) => (
              <span key={i} className="text-[10px] bg-[#F5F3F0] text-[#5a6672] px-2 py-0.5 rounded-full capitalize">{c}</span>
            ))}
            {cfg.scoring_criteria.length > 3 && (
              <span className="text-[10px] text-[#9aa5ae]">+{cfg.scoring_criteria.length - 3} more</span>
            )}
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-[#F0EDE9] flex gap-2">
          <button onClick={() => onOpen(event)}
            className="flex-1 bg-[#012d1d] hover:bg-[#023d29] text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-[15px]">open_in_new</span>
            Open Dashboard
          </button>
          <button onClick={() => onDelete(event)}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#E2DDD8] text-[#9aa5ae] hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all">
            <span className="material-symbols-outlined text-[16px]">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventSelector({ organizer, onSelectEvent, onNewEvent, onLogout }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://orchestr-ai.onrender.com/events?organizer_id=${organizer.id}`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch { setEvents([]); }
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, [organizer.id]);

  const handleDelete = async (event) => {
    if (!confirm(`Delete "${event.name}" and ALL its data?\n\nThis cannot be undone.`)) return;
    setDeleting(event.id);
    try {
      await fetch(`https://orchestr-ai.onrender.com/events/${event.id}`, { method: "DELETE" });
      fetchEvents();
    } catch { alert("Delete failed."); }
    setDeleting(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F3F0]">
      {/* Top nav */}
      <nav className="bg-white border-b border-[#E2DDD8] px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#012d1d] flex items-center justify-center">
            <span className="material-symbols-outlined text-[#a5d0b9] text-[16px]">terminal</span>
          </div>
          <span className="font-extrabold text-[#012d1d]">Wise@TI</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-bold text-[#012d1d]">{organizer.name}</p>
            <p className="text-[10px] text-[#5a6672]">{organizer.email}</p>
          </div>
          <button onClick={onLogout}
            className="flex items-center gap-1.5 text-xs font-bold text-[#5a6672] hover:text-[#012d1d] px-3 py-2 rounded-lg hover:bg-[#F5F3F0] transition-colors">
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-[#012d1d] mb-2">
              Your Events
            </h1>
            <p className="text-[#5a6672]">
              {events.length === 0
                ? "No events yet. Create your first event to get started."
                : `${events.length} event${events.length !== 1 ? "s" : ""} managed by you`}
            </p>
          </div>
          <button onClick={onNewEvent}
            className="flex items-center gap-2 bg-[#012d1d] hover:bg-[#023d29] text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            New Event
          </button>
        </div>

        {/* Events grid */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-2 border-[#012d1d] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-[#5a6672]">Loading your events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-[#012d1d]/5 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-[#012d1d]/30 text-4xl">event</span>
            </div>
            <h2 className="text-xl font-bold text-[#012d1d] mb-2">No events yet</h2>
            <p className="text-sm text-[#5a6672] mb-8 max-w-sm mx-auto">
              Create your first event and the AI will configure the entire platform for you.
            </p>
            <button onClick={onNewEvent}
              className="inline-flex items-center gap-2 bg-[#012d1d] text-white font-bold px-8 py-3.5 rounded-2xl hover:bg-[#023d29] transition-all shadow-lg">
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              Create Your First Event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => (
              <div key={event.id} className={deleting === event.id ? "opacity-40 pointer-events-none" : ""}>
                <EventCard event={event} onOpen={onSelectEvent} onDelete={handleDelete} />
              </div>
            ))}

            {/* New event card */}
            <button onClick={onNewEvent}
              className="rounded-2xl border-2 border-dashed border-[#E2DDD8] hover:border-[#012d1d]/40 hover:bg-white flex flex-col items-center justify-center gap-4 p-8 min-h-[320px] transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-[#F5F3F0] group-hover:bg-[#012d1d]/5 flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-[#012d1d]/40 group-hover:text-[#012d1d]/70 text-3xl">add_circle</span>
              </div>
              <div className="text-center">
                <p className="font-bold text-[#012d1d] text-sm">Create New Event</p>
                <p className="text-xs text-[#5a6672] mt-1 max-w-[160px]">Describe it in plain language — AI does the rest</p>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
