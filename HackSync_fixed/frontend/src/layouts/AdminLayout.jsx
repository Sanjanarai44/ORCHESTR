import { useState } from "react";
import Sidebar from "../components/dashboard/Sidebar";
import Topbar from "../components/dashboard/Topbar";

export default function AdminLayout({ children, activeTab, setActiveTab, eventConfig, organizer, onBack, onLogout }) {
  const [darkMode, setDarkMode] = useState(false);
  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="bg-[#F5F3F0] dark:bg-[#0f172a] min-h-screen transition-all duration-300">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} eventConfig={eventConfig}
          organizer={organizer} onBack={onBack} onLogout={onLogout} />
        <div className="ml-[280px]">
          <Topbar darkMode={darkMode} setDarkMode={setDarkMode} eventConfig={eventConfig} />
          <main className="p-8 lg:p-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
