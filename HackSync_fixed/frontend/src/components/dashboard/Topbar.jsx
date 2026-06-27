function Topbar({ darkMode, setDarkMode, eventConfig, organizer, onProfileClick, onMenuToggle }) {
  const eventName = eventConfig?.event_name || "Admin Console";
  const initials = organizer?.name
    ? organizer.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "A";

  return (
    <header className="sticky top-0 z-40 bg-[#F5F3F0]/80 dark:bg-[#111827]/80 backdrop-blur-md h-16 flex justify-between items-center w-full px-4 sm:px-6 md:px-10 border-b border-gray-200 dark:border-gray-800 transition-all">

      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-lg text-gray-600 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        {eventConfig && (
          <div className="hidden sm:flex items-center gap-2 bg-[#1B4332]/8 border border-[#1B4332]/20 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1B4332] animate-pulse" />
            <span className="text-xs font-bold text-[#1B4332] truncate max-w-[140px]">{eventName}</span>
          </div>
        )}

        <div className="relative bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-gray-700 rounded-full px-3 sm:px-4 py-2 hidden sm:flex items-center w-48 md:w-72 shadow-sm">
          <span className="material-symbols-outlined text-gray-400 text-sm mr-2">search</span>
          <input
            className="bg-transparent border-none outline-none text-sm w-full dark:text-white placeholder-gray-400"
            placeholder="Search data points..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-full bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-white transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">
            {darkMode ? "light_mode" : "dark_mode"}
          </span>
        </button>

        <button className="p-2 rounded-full bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-white relative">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
        </button>

        {/* Clickable profile pill */}
        <button
          onClick={onProfileClick}
          className="flex items-center gap-2 sm:gap-3 bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-gray-700 rounded-full px-2 sm:px-4 py-1.5 shadow-sm hover:shadow-md hover:border-[#1B4332]/40 transition-all"
        >
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-black dark:text-white">
              {organizer?.name || "Admin"}
            </p>
            <p className="text-[9px] font-bold text-gray-500 uppercase">Full Access</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#1B4332] text-white flex items-center justify-center text-xs font-bold">
            {organizer?.avatarUrl
              ? <img src={organizer.avatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
              : initials}
          </div>
        </button>
      </div>
    </header>
  );
}

export default Topbar;