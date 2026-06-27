import { useState } from "react";
import Sidebar from "../components/dashboard/Sidebar";
import Topbar from "../components/dashboard/Topbar";

export default function AdminLayout({ children, activeTab, setActiveTab, eventConfig, organizer, onBack, onLogout }) {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="bg-[#F5F3F0] dark:bg-[#0f172a] min-h-screen transition-all duration-300">
        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); setSidebarOpen(false); }}
          eventConfig={eventConfig}
          organizer={organizer}
          onBack={onBack}
          onLogout={onLogout}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="md:ml-[280px]">
          <Topbar
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            eventConfig={eventConfig}
            organizer={organizer}
            onProfileClick={() => setActiveTab("Profile")}
            onMenuToggle={() => setSidebarOpen(o => !o)}
          />
          <main className="p-4 sm:p-6 lg:p-10">{children}</main>
        </div>
      </div>
    </div>
  );
}