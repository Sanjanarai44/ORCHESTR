import React, { useState, useEffect, useRef } from 'react';
import { participantsApi } from '../../api';

const NODE = import.meta.env.VITE_NODE_URL || 'https://orchestr-backend-8u5k.onrender.com';

export default function ParticipantsTab({ eventId }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", skill: "Frontend", institution: "" });
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const fetchParticipants = async () => {
    if (!eventId) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const response = await participantsApi.getAll(eventId);
      if (response.success) {
        const liveRoster = (response.data || []).map((hacker, index) => {
          const role = hacker.skill ? hacker.skill.toUpperCase().trim() : "DEV";
          let normalizedRole = role === "ZZDEV" ? "DEV" : role;
          let roleColor = "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300";
          if (normalizedRole === "DESIGN" || normalizedRole === "DESIGNER") {
            roleColor = "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
          } else if (normalizedRole === "PM") {
            roleColor = "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300";
          }
          return {
            id: hacker.id || index,
            name: hacker.name || "Anonymous User",
            email: hacker.email || "No email available",
            initial: hacker.name
              ? hacker.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)
              : "??",
            university: hacker.college || hacker.institution || "Not Specified",
            role: normalizedRole,
            roleColor,
            team: hacker.teamName ? `Teamed (${hacker.teamName})` : "Looking for Team",
            looking: !hacker.teamName,
            date: hacker.createdAt
              ? new Date(hacker.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
              : "Recently Added",
          };
        });
        setParticipants(liveRoster);
        setSelectedRows(new Array(liveRoster.length).fill(false));
      }
    } catch (err) {
      setError(err.message || "Failed to fetch participants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchParticipants(); }, [eventId]);

  const handleRowSelect = (index) => {
    setSelectedRows(prev => { const copy = [...prev]; copy[index] = !copy[index]; return copy; });
  };

  const handleSelectAll = () => {
    const newState = !selectAll;
    setSelectAll(newState);
    setSelectedRows(participants.map(() => newState));
  };

  const handleUploadCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { alert('Please select a CSV file.'); return; }
    if (!eventId) { alert('No event selected.'); return; }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('eventId', String(eventId));

    setIsUploading(true);
    try {
      const res = await fetch(`${NODE}/api/admin/upload-roster`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Imported ${data.count} participants!`);
        fetchParticipants();
      } else {
        alert(`❌ Upload failed: ${data.message}`);
      }
    } catch (err) {
      alert(`❌ Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddParticipant = async () => {
    if (!addForm.name || !addForm.email) { alert('Name and email are required.'); return; }
    if (!eventId) { alert('No event selected.'); return; }
    setIsSubmittingAdd(true);
    try {
      await participantsApi.add({ ...addForm, eventId: String(eventId) });
      alert('✅ Participant added!');
      setIsAddModalOpen(false);
      setAddForm({ name: "", email: "", skill: "Frontend", institution: "" });
      fetchParticipants();
    } catch (err) {
      alert(`❌ Failed: ${err.message}`);
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleDeleteParticipant = async (id) => {
    if (!confirm('Delete this participant?')) return;
    try {
      await participantsApi.delete(id);
      fetchParticipants();
    } catch (err) {
      alert(`❌ Failed: ${err.message}`);
    }
  };

  if (!eventId) {
    return (
      <div className="p-8 text-center text-stone-500">
        No event selected. Go back and select an event.
      </div>
    );
  }

  const distinctUniversitiesCount = new Set(participants.map(p => p.university)).size;
  const teamedCount = participants.filter(p => !p.looking).length;
  const teamedPercent = participants.length > 0 ? Math.round((teamedCount / participants.length) * 100) : 0;
  const diversityPercent = participants.length > 0 ? Math.min(100, Math.round((distinctUniversitiesCount / participants.length) * 100 * 3)) : 0;
  const dashoffset = 213.6 - (213.6 * diversityPercent) / 100;

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto text-stone-800 dark:text-stone-200">

      {/* Header */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white">Participants</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Manage <span className="font-semibold text-stone-900 dark:text-white">{participants.length}</span> registered participants across{' '}
            <span className="font-semibold text-stone-900 dark:text-white">{distinctUniversitiesCount}</span> institutions.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleUploadCSV} />
          <button
            onClick={fetchParticipants}
            className="h-10 px-4 flex items-center gap-2 bg-stone-200 hover:bg-stone-300/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-sm font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="h-10 px-4 flex items-center gap-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-sm font-semibold border border-stone-300 transition-colors disabled:opacity-50"
          >
            {isUploading
              ? <div className="w-4 h-4 border-2 border-stone-500 border-t-transparent rounded-full animate-spin" />
              : <span className="material-symbols-outlined text-[18px]">upload_file</span>}
            {isUploading ? 'Uploading...' : 'Upload CSV'}
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="h-10 px-4 flex items-center gap-2 bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-100 text-white dark:text-stone-900 rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add Participant
          </button>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Registered", val: participants.length, meta: "Live database count", icon: "person" },
          { label: "Teamed Up", val: teamedCount, meta: "Participants already assigned", icon: "verified" },
          { label: "Institutions", val: distinctUniversitiesCount, meta: "Connected institutions", icon: "school" },
          { label: "Looking for Team", val: participants.length - teamedCount, meta: "Still unassigned", icon: "group_add" },
        ].map((card, i) => (
          <div
            key={i}
            className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200/60 dark:border-stone-800/80 flex flex-col justify-between min-h-[120px]"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-stone-200 text-stone-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">{card.icon}</span>
              </div>
              <div className="text-xs text-stone-500 font-medium text-right leading-tight w-[120px]">{card.meta}</div>
            </div>
            <div className="mt-2">
              <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">{card.label}</p>
              <h4 className="text-2xl font-bold text-stone-900 dark:text-white mt-0.5">{card.val}</h4>
            </div>
          </div>
        ))}
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <section className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200/60 dark:border-stone-800/80 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">
            {selectedRows.filter(Boolean).length > 0
              ? `${selectedRows.filter(Boolean).length} selected`
              : `${participants.length} total`}
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-stone-400">
            <div className="w-6 h-6 border-2 border-stone-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold tracking-wide uppercase">Loading participants...</p>
          </div>
        ) : participants.length === 0 ? (
          <div className="py-16 text-center text-stone-400 space-y-2">
            <span className="material-symbols-outlined text-4xl opacity-30">group_off</span>
            <p className="text-sm font-bold text-stone-700 dark:text-stone-300">No participants yet</p>
            <p className="text-xs max-w-xs mx-auto opacity-70">Upload a CSV or add participants manually to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-stone-200/60 dark:border-stone-800 text-stone-400 dark:text-stone-500 text-[11px] font-bold tracking-wider uppercase">
                  <th className="p-3 w-12 text-center">
                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="w-4 h-4 rounded border-stone-300 cursor-pointer" />
                  </th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-6">University</th>
                  <th className="py-3 px-6 text-center">Role</th>
                  <th className="py-3 px-6">Team Status</th>
                  <th className="py-3 px-6">Registration</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                {participants.map((person, index) => {
                  const isChecked = selectedRows[index];
                  return (
                    <tr
                      key={person.id}
                      onClick={() => handleRowSelect(index)}
                      className={`transition-colors cursor-pointer text-sm ${isChecked ? 'bg-stone-100/60 dark:bg-stone-800/40' : 'hover:bg-stone-50/50 dark:hover:bg-stone-800/20'}`}
                    >
                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isChecked} onChange={() => handleRowSelect(index)} className="w-4 h-4 rounded border-stone-300 cursor-pointer" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {person.initial}
                          </div>
                          <div className="truncate max-w-[220px]">
                            <p className="text-sm font-semibold text-stone-900 dark:text-white leading-tight">{person.name}</p>
                            <p className="text-xs text-stone-400 truncate">{person.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-stone-600 dark:text-stone-300 truncate max-w-[200px]">{person.university}</td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase ${person.roleColor}`}>
                          {person.role}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm">
                        <div className="flex items-center gap-2 font-medium">
                          <span className={`w-1.5 h-1.5 rounded-full ${person.looking ? 'bg-stone-400' : 'bg-emerald-500'}`} />
                          <span className={person.looking ? 'text-stone-400 font-normal' : 'text-stone-800 dark:text-stone-200 font-semibold'}>
                            {person.team}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-stone-400 text-xs">{person.date}</td>
                      <td className="py-4 px-6 text-right" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleDeleteParticipant(person.id)}
                          className="text-stone-400 hover:text-red-500 p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-all"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-between items-center pt-3 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500">
          <p>Showing <span className="font-bold text-stone-700 dark:text-stone-300">{participants.length}</span> participants</p>
        </div>
      </section>

      {/* Bottom Metrics */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200/60 dark:border-stone-800/80 flex items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-base font-bold text-stone-900 dark:text-white">Institution Diversity</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed max-w-md">
              {distinctUniversitiesCount > 0
                ? `${distinctUniversitiesCount} institution${distinctUniversitiesCount !== 1 ? 's' : ''} represented across ${participants.length} participants.`
                : 'No participants yet. Upload a CSV to see diversity metrics.'}
            </p>
          </div>
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle className="text-stone-100 dark:text-stone-800" cx="40" cy="40" fill="transparent" r="34" stroke="currentColor" strokeWidth="6" />
              <circle className="text-stone-900 dark:text-white" cx="40" cy="40" fill="transparent" r="34" stroke="currentColor" strokeDasharray="213.6" strokeDashoffset={dashoffset} strokeWidth="6" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-stone-900 dark:text-white">{diversityPercent}%</span>
            </div>
          </div>
        </div>

        <div className="bg-stone-900 dark:bg-stone-950 text-white rounded-2xl p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="inline-block px-2 py-0.5 bg-white/10 text-white rounded text-[10px] font-bold tracking-widest uppercase">Team Formation</span>
            <h3 className="text-base font-bold">
              {teamedPercent}% Teamed Up
            </h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              {teamedCount} of {participants.length} participants have joined a team.
              {participants.length - teamedCount > 0 && ` ${participants.length - teamedCount} still looking.`}
            </p>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 mt-2">
            <div
              className="bg-white rounded-full h-2 transition-all"
              style={{ width: `${teamedPercent}%` }}
            />
          </div>
        </div>
      </section>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800 p-5 space-y-4">
            <h3 className="text-lg font-bold text-stone-900 dark:text-white">Add Participant</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Full name"
                value={addForm.name}
                onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full h-10 rounded-lg border border-stone-300 dark:border-stone-700 px-3 bg-white dark:bg-stone-950 text-sm"
              />
              <input
                type="email"
                placeholder="Email"
                value={addForm.email}
                onChange={e => setAddForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full h-10 rounded-lg border border-stone-300 dark:border-stone-700 px-3 bg-white dark:bg-stone-950 text-sm"
              />
              <select
                value={addForm.skill}
                onChange={e => setAddForm(prev => ({ ...prev, skill: e.target.value }))}
                className="w-full h-10 rounded-lg border border-stone-300 dark:border-stone-700 px-3 bg-white dark:bg-stone-950 text-sm"
              >
                <option value="Frontend">Frontend</option>
                <option value="Backend">Backend</option>
                <option value="Designer">Designer</option>
              </select>
              <input
                type="text"
                placeholder="Institution"
                value={addForm.institution}
                onChange={e => setAddForm(prev => ({ ...prev, institution: e.target.value }))}
                className="w-full h-10 rounded-lg border border-stone-300 dark:border-stone-700 px-3 bg-white dark:bg-stone-950 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setIsAddModalOpen(false); setAddForm({ name: "", email: "", skill: "Frontend", institution: "" }); }}
                className="h-10 px-4 rounded-lg bg-stone-200 hover:bg-stone-300 text-sm font-semibold text-stone-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddParticipant}
                disabled={isSubmittingAdd}
                className="h-10 px-4 rounded-lg bg-stone-900 hover:bg-stone-800 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSubmittingAdd ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}