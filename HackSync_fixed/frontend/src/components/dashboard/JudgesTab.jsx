import React, { useState, useEffect } from 'react';

const NODE_URL = 'import.meta.env.VITE_NODE_URL || 'http://localhost:5000';
const AI_URL = 'http://localhost:8000';

export default function JudgesTab({ eventConfig, eventId }) {
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [search, setSearch] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isSendingLinks, setIsSendingLinks] = useState(false);
  const [sendLinksMsg, setSendLinksMsg] = useState(null);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '' });
  const [isInviting, setIsInviting] = useState(false);
  const [rubric, setRubric] = useState('');
  const [rubricLoading, setRubricLoading] = useState(false);

  const criteria = eventConfig?.scoring_criteria || ['Innovation', 'Technical Execution', 'Presentation'];

  const fetchJudges = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${NODE_URL}/api/admin/judges`);
      const data = await res.json();
      setJudges(data.judges || []);
    } catch (err) {
      console.error('Failed to fetch judges:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJudges(); }, []);

  const handleAssignTeams = async () => {
    setIsAssigning(true);
    try {
      const res = await fetch(`${NODE_URL}/api/admin/assign-judges`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Teams assigned to judges!`);
        fetchJudges();
      } else {
        alert('❌ Assignment failed: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      alert('❌ Failed to assign teams: ' + err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSendLinks = async () => {
    setIsSendingLinks(true);
    setSendLinksMsg(null);
    try {
      const res = await fetch(`${NODE_URL}/api/admin/send-judge-links`, { method: 'POST' });
      const data = await res.json();
      setSendLinksMsg(data.success
        ? `✅ Magic links sent to ${data.sentCount || 'all'} judges`
        : `❌ ${data.message}`);
      if (data.success) fetchJudges();
    } catch (err) {
      setSendLinksMsg('❌ ' + err.message);
    } finally {
      setIsSendingLinks(false);
    }
  };

  const handleInviteJudge = async () => {
    if (!inviteForm.name || !inviteForm.email) { alert('Name and email required'); return; }
    setIsInviting(true);
    try {
      const res = await fetch(`${NODE_URL}/api/admin/judges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Judge added!');
        setInviteForm({ name: '', email: '' });
        fetchJudges();
      } else {
        alert('❌ ' + (data.message || 'Failed'));
      }
    } catch (err) {
      alert('❌ ' + err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleGenerateRubric = async () => {
    setRubricLoading(true);
    setRubric('');
    try {
      const res = await fetch(`${AI_URL}/generate-rubric`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_name: 'Selected Team', challenge: criteria.join(', ') }),
      });
      const data = await res.json();
      setRubric(data.rubric || 'No rubric generated');
    } catch { setRubric('Failed to generate rubric'); }
    setRubricLoading(false);
  };

  const filtered = judges.filter(j =>
    !search || j.name?.toLowerCase().includes(search.toLowerCase()) || j.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto text-stone-800 dark:text-stone-200">

      {/* Header */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200/60 dark:border-stone-800/60 pb-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white">Judging Panel</h2>
          <p className="text-sm text-stone-500 mt-1">{judges.length} judges · Manage access and evaluation assignments</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-stone-400 text-[18px]">search</span>
            <input type="text" placeholder="Search judges..." value={search} onChange={e => setSearch(e.target.value)}
              onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
              className={`bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all ${isFocused ? 'w-72' : 'w-52'}`} />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Judges', val: judges.length, sub: 'Registered' },
          { label: 'Links Sent', val: judges.filter(j => j.jwtToken).length, sub: 'Magic links active' },
          { label: 'Evaluated', val: judges.filter(j => j.tokenUsed).length, sub: 'Accessed portal' },
          { label: 'Criteria', val: criteria.length, sub: 'Scoring dimensions' },
        ].map((c, i) => (
          <div key={i} className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200/60 dark:border-stone-800 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">{c.label}</p>
            <p className="text-3xl font-bold text-stone-900 dark:text-white">{c.val}</p>
            <p className="text-xs text-stone-400">{c.sub}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-12 gap-4">

        {/* Left: Judges list + actions */}
        <div className="col-span-12 lg:col-span-8 space-y-4">

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button onClick={handleAssignTeams} disabled={isAssigning}
              className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-100 text-white dark:text-stone-900 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all">
              {isAssigning ? <div className="w-4 h-4 border-2 border-white dark:border-stone-900 border-t-transparent rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[18px]">assignment_ind</span>}
              {isAssigning ? 'Assigning...' : 'Auto-Assign Teams'}
            </button>
            <button onClick={handleSendLinks} disabled={isSendingLinks || judges.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-all">
              {isSendingLinks ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[18px]">send</span>}
              {isSendingLinks ? 'Sending...' : 'Send Magic Links'}
            </button>
            <button onClick={fetchJudges} className="flex items-center gap-2 px-4 py-2.5 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-xl text-sm font-semibold transition-all">
              <span className="material-symbols-outlined text-[18px]">refresh</span> Refresh
            </button>
          </div>

          {sendLinksMsg && (
            <div className={`px-4 py-3 rounded-xl text-sm font-medium ${sendLinksMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {sendLinksMsg}
            </div>
          )}

          {/* Judge cards */}
          {loading ? (
            <div className="py-12 text-center"><div className="w-6 h-6 border-2 border-stone-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" /><p className="text-sm text-stone-400">Loading judges...</p></div>
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/60 dark:border-stone-800 p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-stone-300 block mb-3">gavel</span>
              <p className="text-sm font-bold text-stone-600 dark:text-stone-300">{judges.length === 0 ? 'No judges added yet' : 'No judges match search'}</p>
              <p className="text-xs text-stone-400 mt-1">Add judges using the form on the right</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((judge, i) => {
                const assigned = JSON.parse(judge.assignedTeams || '[]');
                return (
                  <div key={i} className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200/60 dark:border-stone-800 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:shadow-md transition-all">
                    <div className="w-12 h-12 rounded-full bg-stone-900 dark:bg-stone-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {judge.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-stone-900 dark:text-white">{judge.name}</p>
                        {judge.tokenUsed && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Accessed</span>}
                        {judge.jwtToken && !judge.tokenUsed && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Link Sent</span>}
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">{judge.email}</p>
                      {assigned.length > 0 && <p className="text-xs text-stone-500 mt-1">{assigned.length} team{assigned.length !== 1 ? 's' : ''} assigned</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-lg font-bold text-stone-900 dark:text-white">{assigned.length}</p>
                        <p className="text-[10px] text-stone-400 uppercase">Teams</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* AI Rubric */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/60 dark:border-stone-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">psychology</span> AI Judge Rubric
              </h3>
              <button onClick={handleGenerateRubric} disabled={rubricLoading}
                className="text-xs font-bold text-stone-600 border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-50 disabled:opacity-50 transition-colors">
                {rubricLoading ? 'Generating...' : 'Generate Rubric'}
              </button>
            </div>
            {rubric ? (
              <pre className="text-xs text-stone-600 dark:text-stone-300 whitespace-pre-wrap leading-relaxed bg-stone-50 dark:bg-stone-800 rounded-xl p-4">{rubric}</pre>
            ) : (
              <p className="text-xs text-stone-400">Click Generate to create an AI evaluation rubric for judges</p>
            )}
          </div>
        </div>

        {/* Right: Add judge + criteria */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="bg-stone-950 p-6 rounded-2xl text-white space-y-4">
            <div>
              <h3 className="font-bold text-white">Add New Judge</h3>
              <p className="text-xs text-stone-400 mt-0.5">Add a judge to the panel manually</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">Full Name</label>
                <input type="text" value={inviteForm.name} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Dr. Jane Smith"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl py-2 px-3 text-sm text-white placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-700" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">Email Address</label>
                <input type="email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="judge@domain.com"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl py-2 px-3 text-sm text-white placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-700" />
              </div>
              <button onClick={handleInviteJudge} disabled={isInviting}
                className="w-full bg-white hover:bg-stone-100 disabled:opacity-50 text-stone-950 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                {isInviting ? <div className="w-4 h-4 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[18px]">person_add</span>}
                {isInviting ? 'Adding...' : 'Add Judge'}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/60 dark:border-stone-800 p-5">
            <h3 className="text-sm font-bold text-stone-900 dark:text-white mb-3 uppercase tracking-wide">Scoring Criteria</h3>
            <div className="space-y-2">
              {criteria.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-900 dark:bg-stone-700 text-white flex items-center justify-center text-[10px] font-bold">{i + 1}</div>
                  <span className="text-sm text-stone-700 dark:text-stone-300 capitalize">{c}</span>
                  <span className="ml-auto text-[10px] text-stone-400 font-bold">0–10</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}