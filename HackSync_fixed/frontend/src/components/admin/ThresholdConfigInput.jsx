import React, { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * ThresholdConfigInput — Admin component exported for T2 (Komalpreet).
 * Inline input to view and update the anomaly detection threshold.
 *
 * Usage: import ThresholdConfigInput from '../components/admin/ThresholdConfigInput';
 */
export default function ThresholdConfigInput() {
  const [threshold, setThreshold] = useState('2.5');
  const [savedThreshold, setSavedThreshold] = useState('2.5');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Load current threshold
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/admin/settings/anomaly-threshold`);
        if (res.ok) {
          const data = await res.json();
          const val = String(data.threshold || 2.5);
          setThreshold(val);
          setSavedThreshold(val);
        }
      } catch { /* non-critical */ }
    };
    load();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    const val = parseFloat(threshold);
    if (isNaN(val) || val < 0.1 || val > 10) {
      showToast('Enter a value between 0.1 and 10', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/settings/anomaly-threshold`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: val }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSavedThreshold(String(val));
      showToast(`Threshold updated to ±${val}`);
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const isDirty = threshold !== savedThreshold;

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <label
          htmlFor="anomaly-threshold-input"
          className="text-xs font-bold text-stone-600 dark:text-stone-400 whitespace-nowrap"
        >
          Anomaly threshold: ±
        </label>
        <input
          id="anomaly-threshold-input"
          type="number"
          min={0.1}
          max={10}
          step={0.1}
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          className="w-20 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1.5 text-sm font-semibold text-stone-900 dark:text-white bg-white dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white"
        />
        <button
          id="save-threshold-btn"
          onClick={handleSave}
          disabled={saving || !isDirty}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            isDirty && !saving
              ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:opacity-90'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
          }`}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Inline toast */}
      {toast && (
        <div
          className={`absolute top-full mt-2 left-0 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm z-10 ${
            toast.type === 'error'
              ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
