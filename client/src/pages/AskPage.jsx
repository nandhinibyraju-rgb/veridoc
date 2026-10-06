import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Stethoscope,
  BookOpen,
  Pill,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { evidenceService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AnswerColumn from '../components/AnswerColumn';
import ReferencesPanel from '../components/ReferencesPanel';
import DockedSearchBar from '../components/DockedSearchBar';
import LoadingSteps from '../components/LoadingSteps';

export default function AskPage() {
  const [searchParams] = useSearchParams();
  const { studentMode, appMode } = useAuth();
  const isStudent = studentMode || appMode === 'student';

  // Thread of questions and answers: [ { id, question, mode, timestamp, data, references } ]
  const [thread, setThread] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState(null);

  // Layout states
  const [isReferencesCollapsed, setIsReferencesCollapsed] = useState(false);
  const [activeCitationId, setActiveCitationId] = useState(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [mobileActiveTab, setMobileActiveTab] = useState('answer'); // 'answer' | 'references'

  // Current docked search mode & type
  const [searchMode, setSearchMode] = useState('quick'); // quick, deep, literature, gaps
  const [searchType, setSearchType] = useState('ai'); // ai, literature, drug

  // Listen for "+ New Question" event from left/history drawer
  useEffect(() => {
    const handleNewQ = () => {
      setThread([]);
      setError(null);
      setLoading(false);
      setActiveQuestionIndex(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('veridoc-new-question', handleNewQ);
    return () => window.removeEventListener('veridoc-new-question', handleNewQ);
  }, []);

  // Handle URL query parameters ?q= or ?id=
  useEffect(() => {
    const qParam = searchParams.get('q');
    const idParam = searchParams.get('id');
    if (idParam) {
      loadHistorySession(idParam);
    } else if (qParam && qParam.trim()) {
      handleSearchSubmit(qParam.trim());
    }
  }, [searchParams]);

  const loadHistorySession = async (sessionId) => {
    setLoading(true);
    setError(null);
    try {
      const item = await evidenceService.getHistoryItem(sessionId);
      if (item) {
        const threadItem = {
          id: item.id,
          question: item.question,
          mode: 'QUICK',
          timestamp: item.searchedAt || item.createdAt,
          data: {
            id: item.id,
            question: item.question,
            result: item.result || {},
            references: item.references || [],
            searchedAt: item.searchedAt
          }
        };
        setThread([threadItem]);
        setActiveQuestionIndex(0);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      setError('Unable to load past clinical inquiry record.');
    } finally {
      setLoading(false);
    }
  };

  // Main search submit handler (Initial inquiry or Follow-up question in thread)
  const handleSearchSubmit = async (questionText, options = {}) => {
    if (!questionText || questionText.trim().length < 3) return;

    setLoading(true);
    setError(null);
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 1200);

    try {
      const mode = options.mode || searchMode;
      const type = options.searchType || searchType;
      const filters = options.filters || {};
      const patientContext = options.patientContext;
      const studyFocus = options.studyFocus;

      let data;
      const rootItem = thread[0];
      if (thread.length > 0 && rootItem?.data?.id && !rootItem.data.id.startsWith('q_')) {
        try {
          data = await evidenceService.followup(rootItem.data.id, questionText.trim());
        } catch (fErr) {
          console.warn('Follow-up call failed, using direct ask:', fErr);
          data = await evidenceService.ask(questionText.trim(), patientContext, {
            mode,
            searchType: type,
            studentMode: Boolean(isStudent),
            studyFocus
          });
        }
      } else {
        data = await evidenceService.ask(questionText.trim(), patientContext, {
          mode,
          searchType: type,
          studentMode: Boolean(isStudent),
          studyFocus
        });
      }

      const newThreadItem = {
        id: data.id || `q_${Date.now()}`,
        question: questionText.trim(),
        mode: mode.toUpperCase(),
        timestamp: new Date().toISOString(),
        data: data
      };

      setThread((prev) => {
        const next = [...prev, newThreadItem];
        setActiveQuestionIndex(next.length - 1);
        return next;
      });

      // Switch mobile tab to answer on new question
      setMobileActiveTab('answer');
    } catch (err) {
      console.error('Evidence query error:', err);
      setError(
        err.response?.data?.error ||
        err.response?.data?.details ||
        'Unable to synthesize peer-reviewed evidence. Please check PubMed availability and try again.'
      );
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  // Click on citation link: scroll to reference card in right panel & highlight
  const handleCitationClick = (citationId) => {
    setActiveCitationId(citationId);
    if (isReferencesCollapsed) {
      setIsReferencesCollapsed(false);
    }
    // On mobile, switch to references tab
    if (window.innerWidth < 1024) {
      setMobileActiveTab('references');
    }

    setTimeout(() => {
      const element = document.getElementById(`ref-card-${citationId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);

    setTimeout(() => {
      setActiveCitationId(null);
    }, 3500);
  };

  const handleRecheck = async (item) => {
    if (!item?.data?.id) return;
    try {
      setLoading(true);
      const updated = await evidenceService.recheck(item.data.id);
      setThread((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, data: updated } : t))
      );
      alert('PubMed re-check complete! Fresh trials retrieved.');
    } catch (err) {
      alert('Re-check failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = (item) => {
    handleSearchSubmit(item.question, { mode: searchMode, searchType });
  };

  const hasResults = thread.length > 0;
  const currentItem = thread[activeQuestionIndex] || thread[thread.length - 1] || null;
  const referencesCount = currentItem?.data?.references?.length || 0;

  const tryAskingPills = isStudent
    ? [
        "what are the uses of paracetamol tablet",
        "How do ACE inhibitors work",
        "Metformin mechanism of action",
        "Pathophysiology of heart failure"
      ]
    : [
        "SGLT2 inhibitors in CKD stage 3b",
        "DAPT duration post-DES in high bleeding risk",
        "GLP-1 RA in heart failure with preserved ejection fraction",
        "what are the uses of paracetamol tablet"
      ];

  return (
    <div className="flex-1 flex flex-col min-h-[calc(100vh-8rem)]">
      {/* View 1: Clean Home State (before any search is submitted) */}
      {!hasResults && !loading && (
        <motion.div
          key={isStudent ? 'student-home' : 'doctor-home'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
          className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto px-4 py-8 sm:py-16 text-center space-y-8"
        >
          <div className="space-y-3">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-400 ${
                isStudent
                  ? 'bg-indigo-50 border border-indigo-200/80 text-indigo-700'
                  : 'bg-teal-50 border border-teal-200/80 text-[#0F766E]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isStudent ? 'Medical Learning & Clinical Reasoning' : 'Evidence-Based Clinical Intelligence'}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900">
              {isStudent ? (
                <>
                  Master clinical medicine, <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4F46E5] to-amber-500">
                    with verified evidence.
                  </span>
                </>
              ) : (
                <>
                  The latest clinical evidence, <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0F766E] to-cyan-500">
                    graded and verified, in seconds.
                  </span>
                </>
              )}
            </h1>

            <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
              {isStudent
                ? 'Understand drug mechanisms, trial pearls, and pathophysiological concepts in simple words.'
                : 'Synthesize live peer-reviewed trials, systematic reviews, and FDA package inserts with zero hallucination guarantee.'}
            </p>
          </div>

          {/* Centered Search Card on Home */}
          <div className="w-full">
            <DockedSearchBar
              isDocked={false}
              loading={loading}
              currentMode={searchMode}
              onModeChange={setSearchMode}
              currentSearchType={searchType}
              onSearchTypeChange={setSearchType}
              onSubmit={handleSearchSubmit}
            />
          </div>

          {/* Try Asking Chips */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {isStudent ? 'Study topics to explore:' : 'Try asking:'}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {tryAskingPills.map((query, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSearchSubmit(query)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border shadow-2xs transition-all cursor-pointer ${
                    isStudent
                      ? 'bg-white hover:bg-indigo-50 hover:border-indigo-300 text-slate-600 hover:text-indigo-700 border-slate-200/80'
                      : 'bg-white hover:bg-teal-50 hover:border-teal-300 text-slate-600 hover:text-[#0F766E] border-slate-200/80'
                  }`}
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading Steps State */}
      {loading && (
        <div className="w-full max-w-4xl mx-auto py-12 px-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <LoadingSteps currentStep={loadingStep} />
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="w-full max-w-4xl mx-auto mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline ml-3 font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* View 2: PART 1 Results Workspace (Split View) */}
      {hasResults && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Mobile Tab Switcher (< lg screens) */}
          <div className="lg:hidden flex items-center justify-center mb-4 px-2">
            <div className="bg-slate-100 p-1 rounded-full border border-slate-200 flex items-center w-full max-w-xs">
              <button
                type="button"
                onClick={() => setMobileActiveTab('answer')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all ${
                  mobileActiveTab === 'answer'
                    ? 'bg-[#22D3EE] text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Answer Thread
              </button>
              <button
                type="button"
                onClick={() => setMobileActiveTab('references')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all ${
                  mobileActiveTab === 'references'
                    ? 'bg-[#22D3EE] text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                References ({referencesCount})
              </button>
            </div>
          </div>

          {/* Desktop Two-Column Split View Workspace */}
          <div className="relative flex-1 flex flex-col lg:flex-row items-start gap-4 sm:gap-6 min-h-0">
            {/* LEFT COLUMN (~60% when expanded, 100% when collapsed): Answer Thread */}
            <div
              className={`w-full transition-all duration-300 ease-in-out ${
                isReferencesCollapsed ? 'lg:w-full' : 'lg:w-[60%]'
              } ${mobileActiveTab === 'references' ? 'hidden lg:block' : 'block'}`}
            >
              <AnswerColumn
                thread={thread}
                onCitationClick={handleCitationClick}
                onRecheck={handleRecheck}
                onRegenerate={handleRegenerate}
                activeCitationId={activeCitationId}
              />
            </div>

            {/* Small Round "< >" Collapse Handle between Columns (Desktop) */}
            <div className="hidden lg:flex items-center justify-center absolute top-12 z-20"
                 style={{ left: isReferencesCollapsed ? 'calc(100% - 18px)' : 'calc(60% - 15px)' }}>
              <button
                type="button"
                onClick={() => setIsReferencesCollapsed((prev) => !prev)}
                className="w-7 h-7 rounded-full bg-white hover:bg-slate-50 border border-slate-300 shadow-md flex items-center justify-center text-slate-600 hover:text-[#0F766E] transition-all hover:scale-105 cursor-pointer"
                title={isReferencesCollapsed ? 'Expand References Panel' : 'Collapse References Panel'}
                aria-label="Toggle references panel"
              >
                {isReferencesCollapsed ? (
                  <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
                ) : (
                  <ChevronRight className="w-4 h-4 stroke-[2.2]" />
                )}
              </button>
            </div>

            {/* RIGHT COLUMN (~40%): References Panel */}
            {!isReferencesCollapsed && (
              <div
                className={`w-full lg:w-[40%] transition-all duration-300 ease-in-out ${
                  mobileActiveTab === 'answer' ? 'hidden lg:block' : 'block'
                }`}
              >
                <ReferencesPanel
                  thread={thread}
                  activeQuestionIndex={activeQuestionIndex}
                  onQuestionSelect={setActiveQuestionIndex}
                  activeCitationId={activeCitationId}
                />
              </div>
            )}
          </div>

          {/* Docked Search Bar at the BOTTOM of the page (Floating rounded card) */}
          <DockedSearchBar
            isDocked={true}
            loading={loading}
            currentMode={searchMode}
            onModeChange={setSearchMode}
            currentSearchType={searchType}
            onSearchTypeChange={setSearchType}
            onSubmit={handleSearchSubmit}
          />
        </div>
      )}
    </div>
  );
}
