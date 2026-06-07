import React from "react";

export default function Sidebar({ activeTab, setActiveTab, eventConfig, organizer, onBack, onLogout }) {
  const eventName = eventConfig?.event_name || "Event Dashboard";
  const eventType = eventConfig?.event_type || "event";

  const navItems = [
    { name: "Dashboard", icon: "dashboard" },
    { name: "Participants", icon: "groups" },
    { name: "Teams", icon: "diversity_3" },
    { name: "Judges", icon: "gavel" },
    { name: "Evaluations", icon: "analytics" },
    { name: "Emails", icon: "mail" },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-[280px] z-50 bg-[#1B4332] text-white flex flex-col py-6 hidden md:flex">

      {/* Back to events */}
      {onBack && (
        <button onClick={onBack}
          className="mx-4 mb-3 flex items-center gap-2 text-[#c1ecd4]/70 hover:text-[#c1ecd4] text-xs font-semibold px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          All Events
        </button>
      )}

      {/* Event header */}
      <div className="px-6 mb-8 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 flex-shrink-0">
            <span className="material-symbols-outlined text-[#c1ecd4]">terminal</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight truncate">{eventName}</h1>
            <p className="text-[10px] uppercase tracking-widest text-[#c1ecd4] font-bold capitalize truncate">{eventType}</p>
          </div>
        </div>

        {/* Config pills */}
        {eventConfig && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {eventConfig.team_size && (
              <span className="text-[10px] bg-white/10 text-[#c1ecd4] rounded-full px-2.5 py-0.5 font-semibold">
                Teams of {eventConfig.team_size}
              </span>
            )}
            {eventConfig.num_judges && (
              <span className="text-[10px] bg-white/10 text-[#c1ecd4] rounded-full px-2.5 py-0.5 font-semibold">
                {eventConfig.num_judges} Judges
              </span>
            )}
            {eventConfig.advancement_rule && (
              <span className="text-[10px] bg-white/10 text-[#c1ecd4] rounded-full px-2.5 py-0.5 font-semibold truncate max-w-full">
                {eventConfig.advancement_rule}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.name;
          return (
            <button key={item.name} type="button" onClick={() => setActiveTab(item.name)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-all duration-150 text-left ${
                isActive
                  ? "bg-white/10 border-l-4 border-[#c1ecd4] text-[#c1ecd4] font-semibold"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              }`}>
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-sm font-medium">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Scoring criteria */}
      {eventConfig?.scoring_criteria?.length > 0 && (
        <div className="px-4 mb-3">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-[10px] font-bold text-white/50 uppercase mb-2">Scoring Criteria</p>
            <div className="flex flex-wrap gap-1">
              {eventConfig.scoring_criteria.map((c, i) => (
                <span key={i} className="text-[10px] text-[#c1ecd4] bg-white/10 rounded-full px-2 py-0.5">{c}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Organizer footer */}
      <div className="px-4 pt-4 border-t border-white/10">
        {organizer && (
          <div className="bg-white/5 rounded-xl p-3 mb-3 flex items-center justify-between border border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[#c1ecd4] flex items-center justify-center text-[#1B4332] text-[10px] font-bold flex-shrink-0">
                {organizer.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{organizer.name}</p>
                <p className="text-[10px] text-white/50 truncate">{organizer.email}</p>
              </div>
            </div>
            {onLogout && (
              <button onClick={onLogout} title="Sign out"
                className="text-white/40 hover:text-white/80 transition-colors flex-shrink-0 ml-2">
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
