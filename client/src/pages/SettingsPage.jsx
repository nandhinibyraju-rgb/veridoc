import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService, evidenceService } from '../services/api';
import { Settings, Shield, Trash2, Sun, Moon, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();

  const [defaultMode, setDefaultMode] = useState(user?.default_mode || 'doctor');
  const [retention, setRetention] = useState(user?.history_retention || 'forever');
  const [theme, setTheme] = useState(user?.theme || 'light');
  const [statusMsg, setStatusMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSavePreferences = async () => {
    setSaving(true);
    setStatusMsg('');
    try {
      const res = await authService.updateProfile({
        default_mode: defaultMode,
        history_retention: retention,
        theme: theme
      });
      updateUser(res.user);
      setStatusMsg('Preferences saved successfully.');
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to delete ALL clinical search history? This cannot be undone.')) {
      return;
    }
    try {
      await evidenceService.clearAllHistory();
      alert('All clinical search records have been purged.');
    } catch (err) {
      alert('Failed to clear history: ' + err.message);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.prompt(
      'To permanently delete your clinician account and all data, type "DELETE":'
    );
    if (confirmation !== 'DELETE') return;

    try {
      await authService.deleteAccount();
      alert('Your Veridoc account and data have been permanently removed.');
      logout();
    } catch (err) {
      alert('Failed to delete account: ' + err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F766E]">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Clinical Settings</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize default interaction mode, data retention, and account security.
            </p>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Mode & Theme Settings */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
          Interaction & Interface
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Default Synthesis Mode
            </label>
            <select
              value={defaultMode}
              onChange={(e) => setDefaultMode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs outline-none focus:border-[#0F766E]"
            >
              <option value="doctor">Doctor Mode (High-yield bottom line & GDMT)</option>
              <option value="student">Student Mode (Mechanisms & learning pearls)</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Sets the initial mode when opening the Ask interface.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Color Theme
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs outline-none focus:border-[#0F766E]"
            >
              <option value="light">Clinical Light (Recommended)</option>
              <option value="dark">Dark Mode</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Optimized for clinical readability under varied lighting conditions.
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSavePreferences}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>

      {/* Privacy & History Retention */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#0F766E]" />
          <span>Privacy & Data Retention</span>
        </h2>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Clinical History Retention Policy
          </label>
          <select
            value={retention}
            onChange={(e) => setRetention(e.target.value)}
            className="w-full sm:w-72 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs outline-none focus:border-[#0F766E]"
          >
            <option value="forever">Retain indefinitely until manually deleted</option>
            <option value="30days">Auto-purge after 30 days</option>
            <option value="7days">Auto-purge after 7 days</option>
            <option value="session">Session only (do not retain past queries)</option>
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            Patient context and synthesis records will follow this retention rule on our secure encrypted SQLite store.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900">Purge Search History</h3>
            <p className="text-[11px] text-slate-500">
              Permanently delete all previous clinical queries and saved syntheses.
            </p>
          </div>
          <button
            onClick={handleClearHistory}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete All History</span>
          </button>
        </div>
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="bg-red-50/50 rounded-2xl border border-red-200/80 p-6 shadow-xs">
        <div className="flex items-center gap-2 text-red-800 mb-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider">Danger Zone</h2>
        </div>
        <p className="text-xs text-red-700/80 leading-relaxed">
          Deleting your clinician account permanently purges your credentials, preferences, bookmarks, and all saved query sessions. This action cannot be undone.
        </p>

        <div className="mt-4 pt-4 border-t border-red-200/60 flex justify-end">
          <button
            onClick={handleDeleteAccount}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            Delete Account Permanently
          </button>
        </div>
      </div>
    </div>
  );
}
