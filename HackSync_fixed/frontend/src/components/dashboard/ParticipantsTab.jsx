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
      // FIXED: pass eventId
      const response = await participantsApi.getAll(eventId);
      if (response.success) {
        const liveRoster = (response.data || []).map((hacker, index) => {
          const role = hacker.skill ? hacker.skill.toUpperCase().trim() : "DEV";
          let normalizedRole = role === "ZZDEV" ? "DEV" : role;
          let roleColor = "bg-teal-100 text-teal-800";
          if (normalizedRole === "DESIGN") roleColor = "bg-blue-100 text-blue-800";
          else if (normalizedRole === "PM") roleColor = "bg-stone-200 text-stone-700";
          return {
            id: hacker.id || index,
            name: hacker.name || "Anonymous User",
            email: hacker.email || "No email available",
            initial: hacker.name ? hacker.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) : "??",
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
    // FIXED: pass eventId in formData
    formData.append('eventId', eventId);

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
      // FIXED: pass eventId
      await participantsApi.add({ ...addForm, eventId });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Participants</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            {participants.length} participant{participants.length !== 1 ? 's' : ''} in this event
          </p>
        </div>
        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleUploadCSV}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            {isUploading ? 'Uploading...' : 'Upload CSV'}
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add Participant
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-500 text-sm">Loading participants...</div>
        ) : participants.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-stone-300 text-5xl block mb-3">group_off</span>
            <p className="text-stone-500 text-sm">No participants yet. Upload a CSV to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="rounded" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wide">College</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wide">Skill</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wide">Team</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wide">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {participants.map((p, i) => (
                <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows[i] || false}
                      onChange={() => handleRowSelect(i)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-700">
                        {p.initial}
                      </div>
                      <span className="font-semibold text-stone-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{p.email}</td>
                  <td className="px-4 py-3 text-stone-600">{p.university}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.roleColor}`}>
                      {p.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${p.looking ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {p.team}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs">{p.date}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDeleteParticipant(p.id)}
                      className="text-stone-400 hover:text-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-stone-900 mb-4">Add Participant</h3>
            <div className="space-y-4">
              {[
                { label: "Name", key: "name", type: "text", placeholder: "Full name" },
                { label: "Email", key: "email", type: "email", placeholder: "email@example.com" },
                { label: "College / Institution", key: "institution", type: "text", placeholder: "University name" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wide block mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    value={addForm[f.key]}
                    onChange={e => setAddForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-stone-500"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wide block mb-1">Skill</label>
                <select
                  value={addForm.skill}
                  onChange={e => setAddForm(prev => ({ ...prev, skill: e.target.value }))}
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-stone-500"
                >
                  <option>Frontend</option>
                  <option>Backend</option>
                  <option>Designer</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold text-stone-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddParticipant}
                disabled={isSubmittingAdd}
                className="flex-1 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-semibold disabled:opacity-50"
              >
                {isSubmittingAdd ? 'Adding...' : 'Add Participant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}