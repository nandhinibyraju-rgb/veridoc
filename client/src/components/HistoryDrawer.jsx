import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  PlusCircle,
  Star,
  Trash2,
  Clock,
  Sparkles,
  Stethoscope,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { evidenceService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function HistoryDrawer({ isOpen, onClose, onSelectSession, onNewQuestion }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await evidenceService.getHistory();
      setSessions(res.history || []);
    } catch (err) {
      console.warn('Failed to load sessions in drawer:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  const handleToggleFavorite = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await evidenceService.toggleFavorite(id);
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isFavorite: res.isFavorite } : s))
      );
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this clinical session?')) return;
    try {
      await evidenceService.deleteHistoryItem(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  if (!isOpen) return null;

  const doctorName = user?.name || 'Dr. Sarah Chen, MD';
  const doctorSpecialty = user?.specialty || 'Cardiology';

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-in drawer from left */}
      <div className="relative w-full max-w-xs sm:max-w-sm bg-white shadow-2xl flex flex-col h-full z-10 border-r border-slate-200 animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="p-4 bg-gradient-to-r from-sky-50 via-teal-50/40 to-white border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0F766E] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {doctorName.replace(/^(Dr\.|MD)\s*/i, '').charAt(0) || 'D'}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 truncate leading-tight">{doctorName}</div>
              <div className="text-[10px] text-teal-700 font-medium">{doctorSpecialty}</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Close history drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action: + New Question */}
        <div className="p-3 border-b border-slate-100">
          <button
            onClick={() => {
              onClose();
              if (onNewQuestion) onNewQuestion();
            }}
            className="w-full py-2 px-3 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all group"
          >
            <PlusCircle className="w-4 h-4 text-cyan-300 group-hover:rotate-90 transition-transform duration-150" />
            <span>New Clinical Question</span>
          </button>
        </div>

        {/* Session History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#0F766E]" />
              Session History
            </span>
            <span className="text-[10px] font-mono text-slate-400">({sessions.length})</span>
          </div>

          {loading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-11 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 px-4">
              <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <Stethoscope className="w-4 h-4" />
              </div>
              <p className="font-semibold text-slate-600">No session history yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Submit your first clinical query to begin.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => {
                    onClose();
                    if (onSelectSession) {
                      onSelectSession(session.id);
                    } else {
                      navigate(`/?id=${session.id}`);
                    }
                  }}
                  className="group flex items-center justify-between p-2.5 rounded-xl text-xs hover:bg-slate-50 border border-transparent hover:border-slate-100 cursor-pointer transition-all"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-medium text-slate-800 line-clamp-2 leading-snug group-hover:text-[#0F766E]">
                      {session.question}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                      <span>{new Date(session.createdAt || session.searchedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      {session.findingsCount > 0 && <span>• {session.findingsCount} findings</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={(e) => handleToggleFavorite(e, session.id)}
                      className={`p-1 rounded-md transition-colors ${session.isFavorite ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}`}
                      title={session.isFavorite ? 'Favorited' : 'Favorite'}
                    >
                      <Star className={`w-3.5 h-3.5 ${session.isFavorite ? 'fill-amber-400 stroke-amber-500' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      className="p-1 rounded-md text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0F766E]" />
            Encrypted session storage
          </span>
          <button
            onClick={() => {
              onClose();
              navigate('/privacy');
            }}
            className="text-[#0F766E] hover:underline font-medium"
          >
            Privacy
          </button>
        </div>
      </div>
    </div>
  );
}
