import React from 'react';

export default function ParticipantSidebar({ activeSection, onNavClick }) {
  const links = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { id: 'teams', icon: 'groups', label: 'Teams' },
    { id: 'timeline', icon: 'calendar_today', label: 'Timeline' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full flex flex-col py-8 bg-[#012d1d] text-white w-64 shadow-xl z-50">
      <div className="px-6 mb-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[#eafdff] flex items-center justify-center overflow-hidden">
            <img 
              alt="Wise@TI Logo" 
              className="w-8 h-8" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA3l1LjI9mJJ-U8WLRaJnnJlRWkjMElQDudJRogTi2P5qAbIp6AVuiB9AMdPy-CD-OiJZMIfTZoesXivT7owxDn891X_0dKt3bDmESCjHJxLRGp9P6BhyMknXyj7FsNTo19WzufiexkKqttH3szbimIgN7hPTc8BmjGb0yQwKnJ9tRca91oDl0ZFki2o5_Qk-aYQS4OsD8DX9zCeCUIh_QSRwHWIgHELJPQR4wYZF54_BpK06WkpdMXjDk-P8Yk_8OJQduEZQY9vSM" 
            />
          </div>
          <span className="text-2xl font-bold text-[#eafdff]">Wise@TI</span>
        </div>
        <p className="text-sm opacity-70 font-medium">Hackathon Central</p>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {links.map((link) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            onClick={(e) => onNavClick(e, link.id)}
            className={`flex items-center gap-4 rounded-lg px-4 py-3 mx-2 transition-all duration-200 text-sm font-medium ${
              activeSection === link.id
                ? 'bg-[#bee8dc] text-[#00201a] font-semibold'
                : 'text-white/80 hover:text-white hover:bg-[#274e3d]/20'
            }`}
          >
            <span className="material-symbols-outlined">{link.icon}</span>
            <span>{link.label}</span>
          </a>
        ))}
      </nav>

      <div className="mt-auto border-t border-white/10 pt-4 flex flex-col gap-1">
        <a className="flex items-center gap-4 text-white/80 hover:text-white px-4 py-3 mx-2 hover:bg-[#274e3d]/20 transition-all duration-200 text-sm font-medium" href="#">
          <span className="material-symbols-outlined">help</span>
          <span>Support</span>
        </a>
        <a className="flex items-center gap-4 text-white/80 hover:text-white px-4 py-3 mx-2 hover:bg-[#274e3d]/20 transition-all duration-200 text-sm font-medium" href="#">
          <span className="material-symbols-outlined">logout</span>
          <span>Sign Out</span>
        </a>
      </div>
    </aside>
  );
}