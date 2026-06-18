import React, { useState } from 'react';

const NODE = import.meta.env.VITE_NODE_URL || 'https://orchestr-backend-8u5k.onrender.com';
const REPO_URL_PATTERN = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+(\.git)?\/?$/i;

export default function GithubRepoSubmission({ team, onUpdated }) {
  const [editing, setEditing] = useState(!team?.githubRepoUrl);
  const [value, setValue] = useState(team?.githubRepoUrl || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async () => {
    setError('');
    setSuccess('');
    const trimmed = value.trim();
    if (!REPO_URL_PATTERN.test(trimmed)) {
      setError('Enter a valid GitHub repo URL, e.g. https://github.com/owner/repo');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${NODE}/api/participants/team/${team.id}/github-repo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: trimmed }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Repository linked!');
        setEditing(false);
        onUpdated?.(data.githubRepo?.repoUrl || trimmed);
      } else {
        setError(data.error || 'Could not link repository.');
      }
    } catch {
      setError('Could not connect to the server.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#c1c8c2]/30 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[#012d1d]">GitHub Repository</h2>
        {!editing && team?.githubRepoUrl && (
          <button
            onClick={() => { setEditing(true); setValue(team.githubRepoUrl); setSuccess(''); }}
            className="text-xs font-semibold text-[#012d1d] hover:underline"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="https://github.com/your-team/project"
            className="w-full border border-[#c1c8c2]/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#012d1d] bg-[#FAFAF9] transition-colors"
          />
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-[#012d1d] hover:bg-[#023d29] disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-all"
            >
              {saving ? 'Saving...' : 'Save Repository'}
            </button>
            {team?.githubRepoUrl && (
              <button
                onClick={() => { setEditing(false); setValue(team.githubRepoUrl); setError(''); }}
                className="px-4 py-2.5 text-sm font-semibold text-[#5a6672] hover:text-[#012d1d]"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
  <div className="flex items-center justify-between bg-[#F5F3F0] rounded-xl px-4 py-3">
    <a                          // ← added the opening <a tag
      href={team.githubRepoUrl}
      target="_blank"
      rel="noreferrer"
      className="text-sm font-semibold text-[#012d1d] hover:underline truncate"
    >
      {team.githubRepoUrl}
    </a>
    {success && <span className="text-xs text-emerald-600 font-bold ml-3">{success}</span>}
  </div>
)}
    </div>   
  );            
}              