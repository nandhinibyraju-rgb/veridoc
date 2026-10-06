import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellRing,
  ShieldAlert,
  Award,
  ExternalLink,
  Calendar,
  CheckCircle2,
  RotateCw,
  Sparkles,
  AlertTriangle,
  FileText,
  Settings,
  Radio,
  SlidersHorizontal,
  BookmarkCheck
} from 'lucide-react';
import { evidenceService } from '../services/api';
import { useLiveStream } from '../hooks/useLiveStream';
import { useAuth } from '../context/AuthContext';

export default function UpdatesPage() {
  const { studentMode, appMode } = useAuth();
  const isStudent = studentMode || appMode === 'student';
  const { isConnected } = useLiveStream();

  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'safety_alert' | 'meta_analysis' | 'guideline' | 'rct'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newIncomingIds, setNewIncomingIds] = useState(new Set());

  // Notification type preferences
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem('veridoc_notif_prefs');
      return stored ? JSON.parse(stored) : { safety: true, trials: true, guidelines: true };
    } catch {
      return { safety: true, trials: true, guidelines: true };
    }
  });

  const togglePref = (key) => {
    setNotifPrefs((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('veridoc_notif_prefs', JSON.stringify(updated));
      return updated;
    });
  };

  const loadLiveUpdates = async () => {
    try {
      setLoading(true);
      const res = await evidenceService.getLiveUpdates({ limit: 40 });
      setUpdates(res.updates || []);
    } catch (err) {
      console.error('Failed to load live updates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveUpdates();

    // Listen for live SSE new update events
    const handleNewUpdate = (e) => {
      const newUpdate = e.detail;
      if (!newUpdate || !newUpdate.id) return;

      setUpdates((prev) => {
        if (prev.some((item) => item.id === newUpdate.id)) return prev;
        return [newUpdate, ...prev];
      });

      setNewIncomingIds((prev) => new Set(prev).add(newUpdate.id));
      // Clear "New" tag after 15 seconds
      setTimeout(() => {
        setNewIncomingIds((prev) => {
          const next = new Set(prev);
          next.delete(newUpdate.id);
          return next;
        });
      }, 15000);
    };

    window.addEventListener('veridoc-new-update', handleNewUpdate);
    return () => {
      window.removeEventListener('veridoc-new-update', handleNewUpdate);
    };
  }, []);

  const handleManualRefresh = async () => {
    try {
      setRefreshing(true);
      await evidenceService.refreshLiveUpdates();
      await loadLiveUpdates();
    } catch (err) {
      console.warn('Manual refresh notice:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Filter updates based on tab & notification preferences
  const filteredUpdates = updates.filter((item) => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (item.type === 'safety_alert' && !notifPrefs.safety) return false;
    if ((item.type === 'meta_analysis' || item.type === 'rct') && !notifPrefs.trials) return false;
    if (item.type === 'guideline' && !notifPrefs.guidelines) return false;
    return true;
  });

  const getBadgeStyle = (type, severity) => {
    if (type === 'safety_alert' || severity === 'critical') {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (type === 'guideline') {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (type === 'meta_analysis') {
      return 'bg-teal-50 text-[#0F766E] border-teal-200';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'safety_alert':
        return 'Safety Alert';
      case 'guideline':
        return 'Guideline';
      case 'meta_analysis':
        return 'Meta-Analysis';
      case 'rct':
        return 'Clinical Trial';
      default:
        return 'Evidence Digest';
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header with Live pulsing indicator, Refresh button, and Notification settings */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isStudent ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-[#0F766E]'
            }`}>
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Live Clinical Evidence Feed
                </h1>
                {/* Live Indicator with Pulsing Dot */}
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>{isConnected ? 'LIVE' : 'POLLING'}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time updates pushed from NCBI PubMed trials, OpenFDA alerts, CDC, and international guidelines.
              </p>
            </div>
          </div>

          {/* Action Buttons: Refresh Now & Settings Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen((prev) => !prev)}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Notification Feed Settings"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className={`px-4 py-2 rounded-xl text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
                isStudent ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-[#0F766E] hover:bg-teal-800'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh now'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Notification Preferences Drawer */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-3 border-t border-slate-100 overflow-hidden"
            >
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Notification & Feed Preferences
                </span>
                <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifPrefs.safety}
                      onChange={() => togglePref('safety')}
                      className="rounded text-[#0F766E] focus:ring-0"
                    />
                    <span>FDA & CDC Safety Alerts</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifPrefs.trials}
                      onChange={() => togglePref('trials')}
                      className="rounded text-[#0F766E] focus:ring-0"
                    />
                    <span>PubMed Meta-Analyses & RCTs</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifPrefs.guidelines}
                      onChange={() => togglePref('guidelines')}
                      className="rounded text-[#0F766E] focus:ring-0"
                    />
                    <span>Clinical Guidelines</span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter Row: All, Safety Alerts, Meta-Analyses, Guidelines, RCTs */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All Updates' },
            { id: 'safety_alert', label: 'Safety Alerts' },
            { id: 'meta_analysis', label: 'Meta-Analyses' },
            { id: 'guideline', label: 'Guidelines' },
            { id: 'rct', label: 'Randomized Trials' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterType === tab.id
                  ? isStudent
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-[#0F766E] text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Updates Feed List with Slide-in animations */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/4" />
              <div className="h-5 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filteredUpdates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
          <BellRing className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No updates matched your filters</h3>
          <p className="text-xs text-slate-500">Try enabling all categories in settings or click "Refresh now".</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {filteredUpdates.map((item) => {
              const isNewlyArrived = newIncomingIds.has(item.id);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: -20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-xs transition-all relative ${
                    isNewlyArrived
                      ? 'border-[#0F766E] ring-2 ring-teal-100 bg-teal-50/20'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-2 flex-1">
                      {/* Badge row: Type + Source + Date + New Tag */}
                      <div className="flex flex-wrap items-center gap-2">
                        {isNewlyArrived && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500 text-white animate-pulse">
                            NEW
                          </span>
                        )}

                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${getBadgeStyle(item.type, item.severity)}`}>
                          {getTypeLabel(item.type)}
                        </span>

                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {item.source}
                        </span>

                        {item.specialty && (
                          <span className="text-[10px] font-semibold text-slate-400">
                            • {item.specialty}
                          </span>
                        )}

                        <span className="text-[11px] font-mono text-slate-400 ml-auto">
                          {new Date(item.published_at || item.created_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                        {item.title}
                      </h2>

                      {/* Summary */}
                      <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                        {item.summary}
                      </p>
                    </div>

                    {/* External Link Action */}
                    <div className="sm:self-center shrink-0 pt-2 sm:pt-0">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          item.type === 'safety_alert'
                            ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                            : 'bg-teal-50 hover:bg-[#0F766E] text-[#0F766E] hover:text-white border-teal-200'
                        }`}
                      >
                        <span>{item.pmid ? `PubMed PMID ${item.pmid}` : 'Read Official Source'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
