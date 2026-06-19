import { useState } from "react";

const NODE = import.meta.env.VITE_NODE_URL || "https://orchestr-backend-8u5k.onrender.com";

export default function ProfileTab({ organizer, onLogout }) {
  const [form, setForm] = useState({
    name: organizer?.name || "",
    email: organizer?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const initials = organizer?.name
    ? organizer.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "A";

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setError("New passwords don't match.");
      return;
    }
    if (form.newPassword && form.newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${NODE}/api/admin/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizerId: organizer?.id,
          name: form.name,
          email: form.email,
          currentPassword: form.currentPassword || undefined,
          newPassword: form.newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Profile updated successfully.");
        // Update localStorage
        const stored = JSON.parse(localStorage.getItem("organizer") || "{}");
        localStorage.setItem("organizer", JSON.stringify({ ...stored, ...data.organizer }));
        setForm(f => ({ ...f, currentPassword: "", newPassword: "", confirmPassword: "" }));
      } else {
        setError(data.message || "Update failed.");
      }
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-stone-900">Profile Settings</h2>
        <p className="text-sm text-stone-500 mt-1">Manage your organizer account</p>
      </div>

      {/* Avatar card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-[#1B4332] text-white flex items-center justify-center text-2xl font-bold flex-shrink-0">
          {organizer?.avatarUrl
            ? <img src={organizer.avatarUrl} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
            : initials}
        </div>
        <div>
          <p className="font-bold text-stone-900 text-lg">{organizer?.name || "Organizer"}</p>
          <p className="text-sm text-stone-500">{organizer?.email}</p>
          <span className="inline-flex items-center gap-1.5 mt-1.5 text-[10px] font-bold uppercase tracking-widest bg-[#1B4332]/10 text-[#1B4332] px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1B4332]" />
            {organizer?.authProvider === "google" ? "Google Account" : "Email Account"}
          </span>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5">
        <h3 className="font-bold text-stone-800 text-sm uppercase tracking-widest">Account Details</h3>

        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-stone-500 block mb-1.5">Full Name</label>
          <input
            value={form.name}
            onChange={e => set("name", e.target.value)}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B4332] bg-stone-50 transition-colors"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-stone-500 block mb-1.5">Email Address</label>
          <input
            type="email"
            value={form.email}
            onChange={e => set("email", e.target.value)}
            disabled={organizer?.authProvider === "google"}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B4332] bg-stone-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {organizer?.authProvider === "google" && (
            <p className="text-[11px] text-stone-400 mt-1">Email is managed by Google and cannot be changed here.</p>
          )}
        </div>

        {/* Password section — only for email accounts */}
        {organizer?.authProvider !== "google" && (
          <>
            <div className="pt-2 border-t border-stone-100">
              <h3 className="font-bold text-stone-800 text-sm uppercase tracking-widest mb-4">Change Password</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-500 block mb-1.5">Current Password</label>
                  <input
                    type="password"
                    value={form.currentPassword}
                    onChange={e => set("currentPassword", e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B4332] bg-stone-50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-500 block mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={form.newPassword}
                    onChange={e => set("newPassword", e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B4332] bg-stone-50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-500 block mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={e => set("confirmPassword", e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B4332] bg-stone-50 transition-colors"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-red-500 text-[16px]">error</span>
            <p className="text-xs text-red-700 font-medium">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-emerald-500 text-[16px]">check_circle</span>
            <p className="text-xs text-emerald-700 font-medium">{success}</p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-[#1B4332] hover:bg-[#14532d] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {loading
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <span className="material-symbols-outlined text-[18px]">save</span>}
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl border border-red-100 p-6">
        <h3 className="font-bold text-red-700 text-sm uppercase tracking-widest mb-3">Danger Zone</h3>
        <p className="text-xs text-stone-500 mb-4">Signing out will clear your session. You'll need to log in again.</p>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-sm font-bold px-5 py-2.5 rounded-xl transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Sign Out
        </button>
      </div>
    </div>
  );
}