import React, { useEffect, useRef, useState } from 'react';

/**
 * SessionNotes — Collapsible right panel for participant's own session notes.
 * Auto-saves to localStorage on blur, keyed by teamId.
 */
export default function SessionNotes({ teamId }) {
  const [notes, setNotes] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const storageKey = `mentor_notes_${teamId}`;

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setNotes(saved);
  }, [storageKey]);

  const handleBlur = () => {
    localStorage.setItem(storageKey, notes);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  return (
    <div
      className={`flex flex-col border-l border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 transition-all duration-300 ${
        collapsed ? 'w-10' : 'w-64'
      }`}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-between px-3 py-3 border-b border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
        title={collapsed ? 'Expand session notes' : 'Collapse session notes'}
      >
        {!collapsed && (
          <span className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wide">
            Session notes
          </span>
        )}
        <span className={`material-symbols-outlined text-stone-400 text-[18px] transition-transform ${collapsed ? '' : 'rotate-180'}`}>
          chevron_right
        </span>
      </button>

      {/* Notes textarea */}
      {!collapsed && (
        <div className="flex-1 flex flex-col p-3 gap-2">
          <textarea
            id="session-notes-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleBlur}
            placeholder="Jot down ideas, questions, or insights…"
            className="flex-1 w-full resize-none text-xs text-stone-600 dark:text-stone-400 bg-transparent focus:outline-none placeholder-stone-300 dark:placeholder-stone-600 leading-relaxed"
          />
          <div
            className={`text-[10px] font-semibold transition-opacity duration-300 ${
              savedFlash ? 'text-emerald-500 opacity-100' : 'opacity-0'
            }`}
          >
            Saved ✓
          </div>
        </div>
      )}
    </div>
  );
}
