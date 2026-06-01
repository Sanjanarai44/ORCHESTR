import React from 'react';

export default function JudgeSidebar({ activeSection, onNavClick }) {
  const links = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { id: 'evaluation', icon: 'groups', label: 'Teams' },
    { id: 'resources', icon: 'description', label: 'Resources' },
    { id: 'activity', icon: 'psychology', label: 'Mentors' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full flex flex-col py-8 bg-[#012d1d] text-white w-64 shadow-xl z-50">
      <div className="px-6 mb-10">
        <h1 className="text-2xl font-bold text-[#eafdff]">Wise@TI</h1>
        <p className="text-xs opacity-70 tracking-widest mt-1 font-semibold">HACKATHON CENTRAL</p>
      </div>
      
      <nav className="flex-1 space-y-2">
        {links.map((link) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            onClick={(e) => onNavClick(e, link.id)}
            className={`flex items-center gap-4 rounded-lg px-4 py-3 mx-2 transition-all duration-200 text-sm font-medium ${
              activeSection === link.id
                ? 'bg-[#bee8dc] text-[#00201a] font-semibold shadow-sm'
                : 'text-white/80 hover:text-white hover:bg-[#274e3d]/20'
            }`}
          >
            <span className="material-symbols-outlined">{link.icon}</span>
            <span>{link.label}</span>
          </a>
        ))}
      </nav>

      <div className="mt-auto pt-8 border-t border-white/10">
        <a className="flex items-center gap-4 text-white/80 hover:text-white hover:bg-[#274e3d]/20 transition-all duration-200 px-4 py-3 mx-2 text-sm font-medium" href="#">
          <span className="material-symbols-outlined">help</span>
          <span>Support</span>
        </a>
        <a className="flex items-center gap-4 text-white/80 hover:text-white hover:bg-[#274e3d]/20 transition-all duration-200 px-4 py-3 mx-2 text-sm font-medium" href="#">
          <span className="material-symbols-outlined">logout</span>
          <span>Sign Out</span>
        </a>
      </div>
    </aside>
  );
}