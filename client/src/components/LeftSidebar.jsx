import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  PlusCircle,
  Star,
  Trash2,
  Clock,
  Shield,
  X,
  Stethoscope,
  ChevronRight,
  Sparkles,
  FileText
} from 'lucide-react';
import { evidenceService } from '../services/api';

export default function LeftSidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await evidenceService.getHistory();
      setSessions(res.history || []);
    } catch (err) {
      console.warn('Could not load recent sessions:', err.message);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [location.pathname]);

  const handleToggleFavorite = async (e, id) => {
    e.stopPropagation();
    e.preventDefault();
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
    e.preventDefault();
    if (!window.confirm('Delete this clinical session record?')) return;
    try {
      await evidenceService.deleteHistoryItem(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (location.pathname === `/history/${id}`) {
        navigate('/');
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleNewQuestion = () => {
    if (onClose) onClose();
    navigate('/');
    // Trigger quick focus event on window
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('veridoc-new-question'));
    }, 100);
  };

  const doctorName = user?.name || 'Dr. Sarah Chen, MD';
  const doctorSpecialty = user?.specialty || 'Cardiology';
  const doctorLocation = user?.location || 'Boston, MA';
  const userRole = user?.role === 'student' ? 'Medical Student' : 'Attending Physician';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/90 w-72 select-none">
      {/* Mobile Close Button */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-100">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Navigation</span>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Doctor Card */}
      <div className="p-4 bg-gradient-to-b from-sky-50/70 via-sky-50/20 to-white border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#0F766E] to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-xs border border-teal-600/30">
              {doctorName.replace(/^(Dr\.|MD)\s*/i, '').charAt(0) || 'D'}
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" title="Active Clinician Session" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[#0F172A] truncate leading-tight">
              {doctorName}
            </div>
            <div className="text-[11px] text-teal-700 font-medium truncate mt-0.5">
              {doctorSpecialty} • {doctorLocation}
            </div>
            <div className="text-[10px] text-slate-600 truncate">
              {userRole}
            </div>
          </div>
        </div>

        {/* + New Question Button */}
        <button
          onClick={handleNewQuestion}
          className="mt-3.5 w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] active:scale-[0.99] text-white text-xs font-semibold shadow-xs hover:shadow-teal-700/20 transition-all duration-150 group"
        >
          <PlusCircle className="w-4 h-4 text-cyan-300 group-hover:rotate-90 transition-transform duration-200" />
          <span>New Question</span>
        </button>
      </div>

      {/* Recent Sessions */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="px-2 py-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-600">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-slate-500" />
            Recent Sessions
          </span>
          <span className="text-[10px] text-slate-500 font-mono font-normal">
            ({sessions.length})
          </span>
        </div>

        {loadingSessions ? (
          <div className="p-2 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-8 px-4 text-center">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-600 mb-2">
              <Stethoscope className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-slate-600">No recent sessions yet</p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Ask your first clinical question above to see verified trials.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.slice(0, 15).map((session) => {
              const isCurrent = location.pathname === `/history/${session.id}`;
              return (
                <div
                  key={session.id}
                  onClick={() => {
                    if (onClose) onClose();
                    navigate(`/history/${session.id}`);
                  }}
                  className={`group relative flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all border ${
                    isCurrent
                      ? 'bg-teal-50/80 text-[#0F766E] border-teal-200 font-medium'
                      : 'hover:bg-slate-50 text-slate-700 border-transparent hover:border-slate-100'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="line-clamp-2 leading-snug">
                      {session.question}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-600">
                      <span>{new Date(session.createdAt || session.searchedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      {session.findingsCount > 0 && (
                        <span>• {session.findingsCount} findings</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={(e) => handleToggleFavorite(e, session.id)}
                      title={session.isFavorite ? 'Remove from favorites' : 'Favorite session'}
                      className={`p-1 rounded-md transition-colors ${
                        session.isFavorite
                          ? 'text-amber-500 hover:text-amber-600'
                          : 'text-slate-500 hover:text-amber-500 hover:bg-slate-100'
                      }`}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${session.isFavorite ? 'fill-amber-400 stroke-amber-500' : ''}`}
                      />
                    </button>
                    <button
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      title="Delete session"
                      className="p-1 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Link: Privacy & Safety */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <Link
          to="/privacy"
          onClick={() => {
            if (onClose) onClose();
          }}
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-[#0F766E] hover:bg-white border border-slate-200/60 shadow-2xs transition-all"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Privacy and Safety</span>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-500" />
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block shrink-0 sticky top-16 h-[calc(100vh-4rem)] z-30">
        {sidebarContent}
      </aside>

      {/* Mobile drawer with backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-2xl z-50 flex">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
