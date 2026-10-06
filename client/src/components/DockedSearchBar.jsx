import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ArrowUp,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  BookOpen,
  Pill,
  X,
  RotateCcw,
  User,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DockedSearchBar({
  onSubmit,
  loading = false,
  isDocked = true,
  currentMode = 'quick',
  onModeChange,
  currentSearchType = 'ai',
  onSearchTypeChange
}) {
  const { studentMode, appMode } = useAuth();
  const isStudent = studentMode || appMode === 'student';

  const [questionText, setQuestionText] = useState('');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showPatientContextModal, setShowPatientContextModal] = useState(false);
  const [selectedStudyFocus, setSelectedStudyFocus] = useState('');

  const [patientContext, setPatientContext] = useState({
    age: '',
    sex: '',
    comorbidities: '',
    medications: ''
  });

  const [filters, setFilters] = useState({
    yearRange: '5', // 5 years, 10 years, all
    studyTypes: [],
    minStrength: 'All',
    specialty: 'All'
  });
  const inputRef = useRef(null);

  // Keyboard shortcut: '/' focuses search input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== inputRef.current && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const hasPatientContext = Boolean(patientContext.age || patientContext.sex || patientContext.comorbidities || patientContext.medications);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!questionText.trim() || loading) return;
    if (onSubmit) {
      onSubmit(questionText.trim(), {
        mode: currentMode,
        searchType: currentSearchType,
        filters,
        patientContext: !isStudent && hasPatientContext ? patientContext : undefined,
        studyFocus: isStudent && selectedStudyFocus ? selectedStudyFocus : undefined
      });
    }
    setQuestionText('');
  };

  const handleKeyDownInput = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const chips = [
    { id: 'quick', label: 'Quick', desc: 'Up to 8 papers, concise clinical bottom line' },
    { id: 'deep', label: 'Deep Search', desc: 'Up to 24+ papers with conflicts and subgroups' },
    { id: 'literature', label: 'Literature Review', desc: 'Thematic review of evidence landscape' },
    { id: 'gaps', label: 'Evidence Gaps', desc: 'Identifies missing clinical trials and uncertainties' }
  ];

  const searchTypeOptions = [
    { id: 'ai', label: 'AI Search', icon: Sparkles },
    { id: 'literature', label: 'Literature', icon: BookOpen },
    { id: 'drug', label: 'Drug Info', icon: Pill }
  ];

  const activeFiltersCount = (filters.yearRange !== '5' ? 1 : 0) +
    (filters.studyTypes.length > 0 ? filters.studyTypes.length : 0) +
    (filters.minStrength !== 'All' ? 1 : 0) +
    (filters.specialty !== 'All' ? 1 : 0);

  return (
    <div
      className={
        isDocked
          ? 'fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-4xl px-3 sm:px-4 z-40'
          : 'w-full max-w-3xl mx-auto'
      }
    >
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl hover:shadow-cyan-500/10 transition-all p-2.5 sm:p-3 relative">
        {/* Main Input Row */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          {/* Mode Dropdown (AI Search | Literature | Drug Info) */}
          <div className="relative shrink-0">
            <select
              value={currentSearchType}
              onChange={(e) => onSearchTypeChange && onSearchTypeChange(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer transition-colors"
            >
              <option value="ai">AI Search</option>
              <option value="literature">Literature</option>
              <option value="drug">Drug Info</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Text Input */}
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              onKeyDown={handleKeyDownInput}
              placeholder={
                isStudent
                  ? 'What are you studying today? Ask any drug, condition, or trial...'
                  : 'Search clinical query or patient scenario...'
              }
              className="w-full px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none"
            />
          </div>

          {/* Patient Context Button (Doctor Mode Only) */}
          {!isStudent && (
            <button
              type="button"
              onClick={() => setShowPatientContextModal((prev) => !prev)}
              className={`px-2.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                hasPatientContext
                  ? 'bg-teal-50 text-[#0F766E] border-teal-300 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="Add Patient Context (optional)"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Patient</span>
              {hasPatientContext && (
                <span className="w-2 h-2 rounded-full bg-[#0F766E]" />
              )}
            </button>
          )}

          {/* Filters Button */}
          <button
            type="button"
            onClick={() => setShowFiltersModal((prev) => !prev)}
            className={`px-2.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
              activeFiltersCount > 0
                ? 'bg-teal-50 text-[#0F766E] border-teal-300 font-bold'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Search Filters"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#0F766E] text-white text-[10px] flex items-center justify-center font-mono">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Circular Arrow Submit Button */}
          <button
            type="submit"
            disabled={!questionText.trim() || loading}
            className={`w-9 h-9 rounded-full active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-xs flex items-center justify-center transition-all shrink-0 cursor-pointer ${
              isStudent
                ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold shadow-amber-200/50'
                : 'bg-[#22D3EE] hover:bg-cyan-400 text-slate-900 font-bold'
            }`}
            title="Submit query (Enter)"
            aria-label="Submit search"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>
        </form>

        {/* Chips row below input */}
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => onModeChange && onModeChange(chip.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 transition-all cursor-pointer ${
                currentMode === chip.id
                  ? isStudent
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-300 font-semibold'
                    : 'bg-teal-50 text-[#0F766E] border border-teal-300 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent'
              }`}
              title={chip.desc}
            >
              {chip.label}
            </button>
          ))}

          {/* In Student Mode: Study Focus pills */}
          {isStudent && (
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2 ml-1 shrink-0">
              <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider hidden sm:inline">Focus:</span>
              {['Pharmacology', 'Pathology', 'Clinical Trials', 'Guidelines'].map((focus) => (
                <button
                  key={focus}
                  type="button"
                  onClick={() => setSelectedStudyFocus((prev) => (prev === focus ? '' : focus))}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium shrink-0 transition-all cursor-pointer ${
                    selectedStudyFocus === focus
                      ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/80 border border-slate-200/80 bg-white'
                  }`}
                >
                  {focus}
                </button>
              ))}
            </div>
          )}

          <span className="ml-auto text-[10px] text-slate-400 hidden sm:inline font-mono">
            Press '/' to focus
          </span>
        </div>
      </div>

      {/* Filters Popover / Modal */}
      {showFiltersModal && (
        <div className="absolute bottom-full mb-3 right-4 sm:right-6 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Search Filters</span>
            <button
              onClick={() => setShowFiltersModal(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-3 space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Publication Year</label>
              <select
                value={filters.yearRange}
                onChange={(e) => setFilters(f => ({ ...f, yearRange: e.target.value }))}
                className="w-full p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
              >
                <option value="5">Last 5 years (default recommended)</option>
                <option value="2">Last 2 years (recent only)</option>
                <option value="10">Last 10 years</option>
                <option value="all">All time</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Minimum Evidence Strength</label>
              <select
                value={filters.minStrength}
                onChange={(e) => setFilters(f => ({ ...f, minStrength: e.target.value }))}
                className="w-full p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
              >
                <option value="All">All evidence levels</option>
                <option value="High">High (Meta-analyses & Large RCTs)</option>
                <option value="Moderate">Moderate (RCTs & Prospective Cohorts)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Clinical Specialty</label>
              <select
                value={filters.specialty}
                onChange={(e) => setFilters(f => ({ ...f, specialty: e.target.value }))}
                className="w-full p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
              >
                <option value="All">All specialties</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Nephrology">Nephrology</option>
                <option value="Endocrinology">Endocrinology</option>
                <option value="Internal Medicine">Internal Medicine</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setFilters({ yearRange: '5', studyTypes: [], minStrength: 'All', specialty: 'All' })}
              className="text-[11px] text-slate-400 hover:text-slate-600 underline"
            >
              Reset
            </button>
            <button
              onClick={() => setShowFiltersModal(false)}
              className="px-3 py-1 bg-[#0F766E] text-white rounded-lg text-xs font-semibold"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Patient Context Popover (Doctor Mode Only) */}
      {showPatientContextModal && !isStudent && (
        <div className="absolute bottom-full mb-3 right-4 sm:right-28 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#0F766E]" />
              Patient Context (Optional)
            </span>
            <button
              type="button"
              onClick={() => setShowPatientContextModal(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-3 space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Age</label>
                <input
                  type="text"
                  value={patientContext.age}
                  onChange={(e) => setPatientContext((p) => ({ ...p, age: e.target.value }))}
                  placeholder="e.g. 68"
                  className="w-full p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs outline-none focus:border-teal-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Sex</label>
                <select
                  value={patientContext.sex}
                  onChange={(e) => setPatientContext((p) => ({ ...p, sex: e.target.value }))}
                  className="w-full p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs outline-none cursor-pointer"
                >
                  <option value="">Unspecified</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Comorbidities</label>
              <input
                type="text"
                value={patientContext.comorbidities}
                onChange={(e) => setPatientContext((p) => ({ ...p, comorbidities: e.target.value }))}
                placeholder="e.g. CKD stage 3b, Type 2 Diabetes"
                className="w-full p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs outline-none focus:border-teal-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Current Medications</label>
              <input
                type="text"
                value={patientContext.medications}
                onChange={(e) => setPatientContext((p) => ({ ...p, medications: e.target.value }))}
                placeholder="e.g. Metformin, Lisinopril"
                className="w-full p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs outline-none focus:border-teal-400"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPatientContext({ age: '', sex: '', comorbidities: '', medications: '' })}
              className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setShowPatientContextModal(false)}
              className="px-3 py-1 bg-[#0F766E] text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              Save Context
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
