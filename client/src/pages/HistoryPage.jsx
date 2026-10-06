import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { evidenceService } from '../services/api';
import {
  History as HistoryIcon,
  Search,
  Trash2,
  ExternalLink,
  RotateCw,
  Clock,
  FileText,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [recheckingId, setRecheckingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await evidenceService.getHistory();
      setHistory(data.history || []);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError('Unable to load clinical inquiry history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this clinical audit inquiry?')) return;

    setDeletingId(id);
    try {
      await evidenceService.deleteHistoryItem(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      alert('Failed to delete query record.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRecheck = async (e, id) => {
    e.stopPropagation();
    setRecheckingId(id);
    try {
      const updated = await evidenceService.recheck(id);
      // Update history list item
      setHistory(prev => prev.map(item => item.id === id ? {
        ...item,
        searchedAt: updated.searchedAt,
        bottomLine: updated.result.bottomLine,
        findingsCount: updated.result.findings?.length || 0
      } : item));
      alert('PubMed re-check complete! Fresh evidence retrieved and verified.');
    } catch (err) {
      alert(err.response?.data?.error || 'Re-check failed. Please check network connectivity.');
    } finally {
      setRecheckingId(null);
    }
  };

  const filteredHistory = history.filter(item =>
    item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.bottomLine?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0F766E] mb-1">
            <HistoryIcon className="w-4 h-4" />
            <span>Audit Trail &amp; Past Inquiries</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
            Clinical Inquiry History
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review past evidence syntheses, track clinical questions over time, and re-check for new trials.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F766E] text-white rounded-xl text-sm font-semibold hover:bg-[#0d655e] transition shadow-xs"
        >
          <span>Ask New Question</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Search Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search past questions or key clinical outcomes..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E] bg-slate-50/50 focus:bg-white"
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-teal-200 border-t-[#0F766E] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading clinical inquiry records...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredHistory.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center mx-auto">
            <HistoryIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">No Clinical Queries Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm ? 'No past queries matched your search term.' : 'You haven’t asked any clinical questions yet. Start by asking an evidence inquiry on the Ask page.'}
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-50 border border-teal-200 text-[#0F766E] rounded-xl text-xs font-semibold hover:bg-teal-100 transition"
          >
            <span>Ask Your First Question</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* History List */}
      {!loading && filteredHistory.length > 0 && (
        <div className="space-y-4">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/history/${item.id}`)}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:border-teal-300 hover:shadow-sm transition cursor-pointer group"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1 font-medium text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(item.searchedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded-md bg-teal-50 text-[#0F766E] font-semibold text-[11px] border border-teal-200/60">
                      {item.findingsCount} Graded Findings
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#0F172A] group-hover:text-[#0F766E] transition">
                    {item.question}
                  </h3>

                  {item.bottomLine && (
                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {item.bottomLine}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* Re-check button (Phase 3 Stretch) */}
                  <button
                    type="button"
                    onClick={(e) => handleRecheck(e, item.id)}
                    disabled={recheckingId === item.id}
                    title="Re-query PubMed live for newly published evidence"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-teal-50 hover:text-[#0F766E] hover:border-teal-200 border border-slate-200 rounded-lg transition disabled:opacity-50"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${recheckingId === item.id ? 'animate-spin text-[#0F766E]' : ''}`} />
                    <span className="hidden md:inline">Re-check</span>
                  </button>

                  {/* Open details */}
                  <button
                    type="button"
                    onClick={() => navigate(`/history/${item.id}`)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#0F766E] bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition"
                  >
                    <span>View Result</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, item.id)}
                    disabled={deletingId === item.id}
                    title="Delete query record"
                    className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
