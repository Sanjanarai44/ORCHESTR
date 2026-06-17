import React, { useState } from "react";

export default function OrganizerLogin({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError("");
    if (!form.email || !form.password) { setError("Email and password are required."); return; }
    if (mode === "register" && !form.name) { setError("Name is required."); return; }
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const body = mode === "login"
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };
      const res = await fetch(`${import.meta.env.VITE_AI_URL || 'https://orchestr-ai.onrender.com'}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
          localStorage.setItem("organizer", JSON.stringify(data.organizer));

          if (data.token) {
            localStorage.setItem("adminToken", data.token);
          }

          onLogin(data.organizer);
        }
       else {
        setError(data.error || "Something went wrong.");
      }
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3F0] flex items-center justify-center px-4"
      style={{
        backgroundImage: "linear-gradient(#012d1d 1px, transparent 1px), linear-gradient(90deg, #012d1d 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        backgroundBlendMode: "overlay",
      }}>
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#012d1d] mb-4 shadow-xl">
            <span className="material-symbols-outlined text-[#a5d0b9] text-[28px]">terminal</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#012d1d]">ORCHESTR</h1>
          <p className="text-sm text-[#5a6672] mt-1">Event Orchestration Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-[#E2DDD8] p-8">
          {/* Tab toggle */}
          <div className="flex bg-[#F5F3F0] rounded-xl p-1 mb-7">
            {["login", "register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg capitalize transition-all ${
                  mode === m ? "bg-white text-[#012d1d] shadow-sm" : "text-[#5a6672] hover:text-[#012d1d]"
                }`}>
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#5a6672] block mb-1.5">Full Name</label>
                <input value={form.name} onChange={e => set("name", e.target.value)}
                  placeholder="Jane Organizer"
                  className="w-full border border-[#E2DDD8] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#012d1d] bg-[#FAFAF9] transition-colors" />
              </div>
            )}
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#5a6672] block mb-1.5">Email Address</label>
              <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="you@organisation.com"
                className="w-full border border-[#E2DDD8] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#012d1d] bg-[#FAFAF9] transition-colors" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#5a6672] block mb-1.5">Password</label>
              <input type="password" value={form.password} onChange={e => set("password", e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="••••••••"
                className="w-full border border-[#E2DDD8] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#012d1d] bg-[#FAFAF9] transition-colors" />
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-red-500 text-[16px]">error</span>
              <p className="text-xs text-red-700 font-medium">{error}</p>
            </div>
          )}
          <a
            href={`${import.meta.env.VITE_AI_URL || "http://localhost:5000"}/auth/google`}
            className="w-full mt-5 border border-[#E2DDD8] rounded-2xl py-4 px-5 flex items-center justify-center gap-4 bg-white hover:bg-[#FAFAF9] transition-all shadow-sm"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-6 h-6"
            />
            <span className="font-semibold text-[#012d1d] text-lg">
              Continue with Google
            </span>
          </a>
          <div className="flex items-center my-6">
  <div className="flex-1 h-px bg-[#E2DDD8]" />
  <span className="px-4 text-sm text-[#8A8A8A] font-medium">OR</span>
  <div className="flex-1 h-px bg-[#E2DDD8]" />
</div>
          <button onClick={handleSubmit} disabled={loading}
            className="w-full mt-6 bg-[#012d1d] hover:bg-[#023d29] disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg">
            {loading
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <span className="material-symbols-outlined text-[18px]">{mode === "login" ? "login" : "person_add"}</span>}
            {loading ? "Please wait..." : mode === "login" ? "Sign In to Platform" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
