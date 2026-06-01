import React from 'react';

export default function TeamAndResources({ team }) {
  const resources = [
    { title: 'API Documentation', icon: 'menu_book', desc: 'Core endpoint schemas' },
    { title: 'Asset Package', icon: 'cloud_download', desc: 'Logos, design UI kits' },
    { title: 'CLI Toolchain', icon: 'terminal', desc: 'Testing & push scripts' },
    { title: 'Developer Support', icon: 'forum', desc: 'Direct access to TAs' },
  ];

  return (
  <div className="space-y-6">

    {/* TOP ROW */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

      {/* Team Structure List */}
      <div className="bg-[#cbe8eb] rounded-xl p-8 flex flex-col h-full hover:shadow-xl hover:shadow-[#012d1d]/5 transition-all duration-300 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-[#012d1d]">
              Team: {team?.name || 'No Team'}
            </h2>

            <p className="text-sm text-[#414844] mt-0.5">
              {team?.members?.length || 0} Active Members
            </p>
          </div>

          <button className="bg-[#012d1d] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-[#012d1d]/90 transition-colors shadow-sm">
            <span
              className="material-symbols-outlined text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              psychology
            </span>
            Find a Mentor
          </button>
        </div>

        <div className="space-y-6 flex-1 flex flex-col justify-center">
          {team?.members?.map((member, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 bg-[#eafdff]/50 p-3 rounded-lg border border-[#c1c8c2]/20"
            >
              <div className="w-12 h-12 rounded-full bg-[#012d1d] text-white font-bold text-sm flex items-center justify-center ring-2 ring-[#c1ecd4]">
                {member.name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>

              <div>
                <p className="text-sm font-bold text-[#031f22]">
                  {member.name}
                </p>

                <p className="text-xs text-[#414844]">
                  {member.skill}
                </p>
              </div>

              <div className="ml-auto flex items-center gap-1.5 bg-[#eafdff] px-2 py-1 rounded-full border border-[#c1c8c2]/30">
                <span className="w-2 h-2 rounded-full bg-[#1b4332]"></span>

                <span className="text-[11px] font-bold uppercase tracking-wider text-[#031f22]">
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Compatibility Card */}
      <div className="bg-[#dff6ea] rounded-xl p-8 flex flex-col border border-[#c1c8c2]/20 shadow-sm min-h-[500px]">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-[#012d1d] flex items-center gap-2">
            <span className="material-symbols-outlined">
              psychology_alt
            </span>
            AI Compatibility
          </h2>

          <p className="text-sm text-[#414844] mt-1">
            LLM-generated team synergy analysis
          </p>
        </div>

        <div className="bg-white/60 rounded-xl p-5 flex-1">
          <p className="text-sm text-[#414844] leading-7">
            {team?.compatibility ||
              'Generating compatibility summary...'}
          </p>
        </div>
      </div>
    </div>

    {/* RESOURCES FULL WIDTH */}
    <div className="bg-[#012d1d] rounded-xl p-8 flex flex-col text-white relative overflow-hidden shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold flex items-center gap-3">
          <span className="material-symbols-outlined text-[#bee8dc]">
            construction
          </span>
          Essential Resources
        </h2>

        <p className="text-xs text-white/60 mt-1">
          Quick links to development tools and toolkits
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {resources.map((res, idx) => (
          <a
            key={idx}
            className="p-4 bg-white/5 rounded-lg hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 flex items-start gap-3 group"
            href="#"
          >
            <span className="material-symbols-outlined text-[#bee8dc] bg-white/5 p-2 rounded-lg group-hover:scale-105 transition-transform">
              {res.icon}
            </span>

            <div>
              <span className="text-sm font-semibold block group-hover:text-[#bee8dc] transition-colors">
                {res.title}
              </span>

              <span className="text-xs text-white/60 mt-0.5 block">
                {res.desc}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>

  </div>
);
}