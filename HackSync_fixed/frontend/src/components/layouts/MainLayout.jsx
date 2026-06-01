import { Outlet } from "react-router-dom";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0f172a] dark:text-white transition-all">
      <Outlet />
    </div>
  );
}