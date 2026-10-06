import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  FileDown,
  Bookmark,
  RotateCw,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Stethoscope,
  Pill,
  CheckCircle2,
  Info,
  ExternalLink,
  HelpCircle,
  Brain,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Award,
  X,
  GraduationCap,
  Activity,
  Flame,
  FileText,
  CornerDownRight,
  MessageSquarePlus,
  Shield
} from 'lucide-react';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function AnswerColumn({
  thread = [],
  onCitationClick,
  onRecheck,
  onRegenerate,
  activeCitationId = null
}) {
  const { studentMode, appMode } = useAuth();
  const isStudent = studentMode || appMode === 'student';

  const [copiedKey, setCopiedKey] = useState(null);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [hoveredCitation, setHoveredCitation] = useState(null);

  // Accordion open/close states (collapsed by default as required in Part 6)
  const [openDetails, setOpenDetails] = useState({});
  const [openLimitations, setOpenLimitations] = useState({});
  const [openMethodology, setOpenMethodology] = useState({});

  // Student mode interactive states
  const [openMechanisms, setOpenMechanisms] = useState({});
  const [activeKeyTermId, setActiveKeyTermId] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});

  const toggleAccordion = (setter, id) => {
    setter((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleQuizSelect = (qKey, optionIdx, correctIdx) => {
    if (quizAnswers[qKey]) return;
    setQuizAnswers((prev) => ({
      ...prev,
      [qKey]: {
        selected: optionIdx,
        isCorrect: optionIdx === correctIdx
      }
    }));
  };

  const handleCopyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleBookmark = (id) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDownloadPdf = (item) => {
    const doc = new jsPDF();
    const margin = 15;
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 118, 110);
    doc.text('VERIDOC CLINICAL EVIDENCE SUMMARY', margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Inquiry: ${item.question}`, margin, y);
    y += 6;
    doc.text(`Searched: ${new Date(item.searchedAt || item.timestamp).toLocaleString()}`, margin, y);
    y += 10;

    const result = item.data?.result || {};

    if (result.title) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(result.title, margin, y);
      y += 8;
    }

    const oneLinerText = result.oneLiner || result.bottomLine;
    if (oneLinerText) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 118, 110);
      doc.text('MAIN ANSWER:', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      const splitOneLiner = doc.splitTextToSize(oneLinerText, 180);
      doc.text(splitOneLiner, margin, y);
      y += splitOneLiner.length * 5 + 6;
    }

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Decision support only. Synthesized strictly from peer-reviewed PubMed and FDA labeling data.', margin, y);

    doc.save(`veridoc-summary-${item.id || 'query'}.pdf`);
  };

  // Helper to format citation author-year label
  const getCitationLabel = (citId, references = []) => {
    const cleanId = String(citId).trim();
    if (cleanId === 'FDA') return '(FDA label)';

    const ref = references.find((r) => String(r.pmid).trim() === cleanId);
    if (!ref) return `(PMID ${cleanId})`;

    const authorStr = ref.authors || '';
    const firstAuthor = authorStr.split(',')[0]?.split(' ')[0] || 'Study';
    const year = ref.year || ref.publicationDate?.substring(0, 4) || '2024';
    return `(${firstAuthor} et al., ${year})`;
  };

  const getCitationReference = (citId, references = []) => {
    const cleanId = String(citId).trim();
    return references.find((r) => String(r.pmid).trim() === cleanId);
  };

  const renderKeyPointIcon = (iconName) => {
    switch ((iconName || '').toLowerCase()) {
      case 'activity':
      case 'analgesic':
        return <Activity className="w-4 h-4 text-[#0F766E]" />;
      case 'flame':
      case 'fever':
      case 'antipyresis':
        return <Flame className="w-4 h-4 text-amber-500" />;
      case 'shield':
      case 'safety':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'alert-triangle':
      case 'warning':
      case 'limit':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-teal-600" />;
    }
  };

  return (
    <div className="space-y-8 pb-32">
      {thread.map((item, qIdx) => {
        const result = item.data?.result || {};
        const references = item.data?.references || [];
        const sections = result.details || result.sections || [];
        const thingsToWatch = result.thingsToWatch || [];
        const counter = `Q${qIdx + 1}/${thread.length}`;

        // Fallback for key points if not already shaped
        const keyPoints = result.keyPoints && result.keyPoints.length > 0
          ? result.keyPoints.slice(0, 4)
          : (sections.slice(0, 3).map((s, idx) => ({
              icon: idx === 0 ? 'activity' : idx === 1 ? 'flame' : 'shield',
              label: s.heading.replace(/^\d+\.\s*/, '').split('(')[0].trim(),
              text: s.text.split('.')[0] + '.',
              citations: s.citations || []
            })));

        const oneLiner = result.oneLiner || result.bottomLine || (sections[0] ? sections[0].text : 'Verified clinical evidence synthesized from peer-reviewed literature.');

        return (
          <div key={item.id || qIdx} className="space-y-4">
            {/* User question bubble */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <div className={`px-4 py-2.5 rounded-2xl rounded-tr-xs text-white text-xs sm:text-sm font-medium shadow-xs max-w-xl transition-colors duration-300 ${
                  isStudent ? 'bg-indigo-600' : 'bg-[#0F766E]'
                }`}>
                  {item.question}
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-400 shrink-0">
                  {counter}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 pr-1">
                <span className={`px-1.5 py-0.5 rounded-md uppercase font-semibold border ${
                  isStudent
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200/80'
                    : 'bg-teal-50 text-teal-700 border-teal-200/80'
                }`}>
                  {item.mode || 'Quick'}
                </span>
                <span>{item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
              </div>
            </div>

            {/* Answer Container Card */}
            <div className={`bg-white rounded-2xl border transition-all duration-300 space-y-4 sm:space-y-5 ${
              isStudent
                ? 'p-5 sm:p-7 border-indigo-100/90 shadow-sm'
                : 'p-5 sm:p-6 border-slate-200/90 shadow-xs'
            }`}>
              {/* 1. Title with a small topic illustration */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                    isStudent
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                      : 'bg-teal-50 border-teal-200 text-[#0F766E]'
                  }`}>
                    {isStudent ? (
                      <GraduationCap className="w-4 h-4 stroke-[2.2]" />
                    ) : (
                      <Stethoscope className="w-4 h-4 stroke-[2.2]" />
                    )}
                  </div>
                  <h1 className={`text-lg sm:text-xl font-bold tracking-tight truncate ${
                    isStudent ? 'text-indigo-900' : 'text-[#0F766E]'
                  }`}>
                    {result.title || 'Clinical Evidence Synthesis'}
                  </h1>
                </div>

                {/* Interpreted As Pill */}
                {result.interpretedAs && (
                  <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                    <Pill className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>{result.interpretedAs}</span>
                  </div>
                )}
              </div>

              {/* Patient context badge if present (Doctor Mode Only) */}
              {!isStudent && item.data?.patientContext && Object.values(item.data.patientContext).some(Boolean) && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Patient Context: <strong>{[item.data.patientContext.age ? `Age ${item.data.patientContext.age}` : null, item.data.patientContext.sex, item.data.patientContext.comorbidities].filter(Boolean).join(', ')}</strong>
                  </span>
                </div>
              )}

              {/* 2. Highlighted "Main answer" card: oneLiner in large bold text + evidence confidence badge */}
              <div className={`p-4 sm:p-5 rounded-xl transition-colors ${
                isStudent
                  ? 'bg-indigo-50/70 border-l-4 border-indigo-600'
                  : 'bg-teal-50/70 border-l-4 border-[#0F766E]'
              }`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${
                    isStudent ? 'text-indigo-700' : 'text-[#0F766E]'
                  }`}>
                    Main Answer
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    result.evidenceConfidence === 'High'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : result.evidenceConfidence === 'Moderate'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-slate-100 text-slate-800 border-slate-300'
                  }`}>
                    {result.evidenceConfidence || 'Moderate'} Certainty
                  </span>
                </div>

                <p className="text-base sm:text-[17px] font-bold text-slate-900 leading-relaxed">
                  {oneLiner}
                </p>
              </div>

              {/* 3. "Key points" as 2-4 compact tiles in a grid */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Key Findings & Clinical Points
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {keyPoints.map((kp, kpIdx) => (
                    <div
                      key={kpIdx}
                      className="p-3.5 rounded-xl bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 transition-all flex flex-col justify-between space-y-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-md bg-white border border-slate-200 shadow-2xs">
                            {renderKeyPointIcon(kp.icon)}
                          </div>
                          <span className="text-xs font-bold text-slate-900">
                            {kp.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-snug">
                          {kp.text}
                        </p>
                      </div>

                      {/* Citation chips */}
                      {kp.citations && kp.citations.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {kp.citations.map((citId, cIdx) => {
                            const label = getCitationLabel(citId, references);
                            const refData = getCitationReference(citId, references);
                            const isHovered = hoveredCitation === `kp-${kpIdx}-${citId}`;

                            return (
                              <span key={cIdx} className="relative inline-block">
                                <button
                                  type="button"
                                  onClick={() => onCitationClick && onCitationClick(citId)}
                                  onMouseEnter={() => setHoveredCitation(`kp-${kpIdx}-${citId}`)}
                                  onMouseLeave={() => setHoveredCitation(null)}
                                  className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                                    String(activeCitationId) === String(citId)
                                      ? 'bg-cyan-200 text-slate-900 ring-2 ring-[#0F766E]'
                                      : 'bg-white hover:bg-teal-50 text-[#0F766E] border border-teal-200 shadow-2xs'
                                  }`}
                                >
                                  {label}
                                </button>

                                {isHovered && refData && (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-slate-900 text-white rounded-xl shadow-xl text-[11px] z-50 pointer-events-none animate-in fade-in duration-150">
                                    <p className="font-semibold line-clamp-2 leading-snug">{refData.title}</p>
                                    <div className="mt-1 flex items-center justify-between text-[10px] text-teal-300">
                                      <span>{refData.journal}</span>
                                      <span className="flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                        PubMed verified
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. "Things to watch" amber card (only if present) */}
              {thingsToWatch.length > 0 && (
                <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    <span>Things to Watch</span>
                  </div>
                  <ul className="space-y-1 text-xs text-amber-950/90 list-disc list-inside">
                    {thingsToWatch.map((item, idx) => (
                      <li key={idx} className="leading-snug">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* STUDENT MODE EXTRAS (Placed cleanly below key points) */}
              {isStudent && (
                <div className="space-y-3 pt-2">
                  {/* Student: In simple words */}
                  {(result.simpleWords || result.bottomLine) && (
                    <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/80 space-y-1.5">
                      <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                        <span>In Simple Words</span>
                      </div>
                      <p className="text-xs sm:text-sm text-indigo-950 leading-relaxed font-medium">
                        {result.simpleWords || result.bottomLine}
                      </p>
                    </div>
                  )}

                  {/* Student: Mechanism of Action (Collapsible) */}
                  {result.mechanism && (
                    <div className="rounded-xl border border-indigo-200/80 bg-white overflow-hidden shadow-2xs">
                      <button
                        type="button"
                        onClick={() => toggleAccordion(setOpenMechanisms, item.id)}
                        className="w-full px-4 py-2.5 bg-indigo-50/60 hover:bg-indigo-50 flex items-center justify-between text-left cursor-pointer transition-colors"
                      >
                        <span className="text-xs font-bold text-indigo-950 flex items-center gap-2">
                          <Brain className="w-4 h-4 text-indigo-600" />
                          How It Works (Mechanism of Action)
                        </span>
                        {openMechanisms[item.id] ? (
                          <ChevronUp className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-indigo-600" />
                        )}
                      </button>
                      {openMechanisms[item.id] && (
                        <div className="p-4 border-t border-indigo-100 text-xs sm:text-sm text-slate-700 leading-relaxed">
                          {result.mechanism}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Student: Key terms glossary chips */}
                  {result.keyTerms && result.keyTerms.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Key Terms (Click for definition)
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {result.keyTerms.map((kt, ktIdx) => {
                          const termKey = `${item.id}-kt-${ktIdx}`;
                          const isTermActive = activeKeyTermId === termKey;
                          return (
                            <div key={ktIdx} className="relative">
                              <button
                                type="button"
                                onClick={() => setActiveKeyTermId(isTermActive ? null : termKey)}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                  isTermActive
                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                    : 'bg-white hover:bg-indigo-50 text-indigo-900 border-indigo-200 shadow-2xs'
                                }`}
                              >
                                <span>{kt.term}</span>
                                <HelpCircle className="w-3 h-3 opacity-60" />
                              </button>
                              {isTermActive && (
                                <div className="absolute left-0 bottom-full mb-2 w-72 p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs z-50 animate-in fade-in duration-150">
                                  <div className="font-bold text-indigo-300 mb-1">{kt.term}</div>
                                  <p className="text-slate-200 text-[11px] leading-relaxed">{kt.definition}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Student: Remember This Flashcard */}
                  {(result.rememberThis || result.bottomLine) && (
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-indigo-50/50 border border-amber-300 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px] uppercase tracking-wider">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-600 fill-amber-400" />
                        <span>Remember This (High-Yield Pearl)</span>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                        {result.rememberThis || result.bottomLine}
                      </p>
                    </div>
                  )}

                  {/* Student: Test Yourself Quiz */}
                  {result.quiz && result.quiz.length > 0 && (
                    <div className="p-4 rounded-xl bg-slate-50/90 border border-indigo-200/90 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-indigo-600" />
                          Test Yourself: 3 Quick Questions
                        </span>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                          PubMed Evidence
                        </span>
                      </div>

                      <div className="space-y-3">
                        {result.quiz.map((q, qIdx) => {
                          const qKey = `${item.id}-quiz-${qIdx}`;
                          const answered = quizAnswers[qKey];
                          return (
                            <div key={qIdx} className="p-3 rounded-lg bg-white border border-slate-200 space-y-2">
                              <p className="text-xs font-bold text-slate-900 leading-snug">
                                <span className="text-indigo-600 mr-1">Q{qIdx + 1}.</span> {q.question}
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {q.options.map((opt, optIdx) => {
                                  const isSelected = answered?.selected === optIdx;
                                  const isCorrectOption = optIdx === q.correctIndex;
                                  let btnStyle = "bg-slate-50 hover:bg-indigo-50 border-slate-200 text-slate-700";
                                  if (answered) {
                                    if (isCorrectOption) {
                                      btnStyle = "bg-emerald-50 border-emerald-400 text-emerald-900 font-bold";
                                    } else if (isSelected) {
                                      btnStyle = "bg-red-50 border-red-300 text-red-900";
                                    } else {
                                      btnStyle = "bg-slate-50 text-slate-400 opacity-60";
                                    }
                                  }

                                  return (
                                    <button
                                      key={optIdx}
                                      type="button"
                                      disabled={Boolean(answered)}
                                      onClick={() => handleQuizSelect(qKey, optIdx, q.correctIndex)}
                                      className={`p-2 rounded-lg border text-left text-[11px] flex items-start gap-1.5 cursor-pointer ${btnStyle}`}
                                    >
                                      <span className="font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                                      <span className="flex-1 leading-snug">{opt}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {answered && (
                                <div className="p-2 rounded-md bg-emerald-50 text-emerald-950 text-[11px] leading-relaxed">
                                  <strong>{answered.isCorrect ? '✓ Correct!' : '✗ Explanation:'}</strong> {q.explanation}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5. "More details" collapsed accordion (Sections, Limitations, How this was generated) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {/* Accordion 1: Full Section Details */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleAccordion(setOpenDetails, item.id)}
                    className="w-full px-4 py-2.5 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between text-left cursor-pointer transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      More Details (Efficacy, Trials & Subgroup Breakdown)
                    </span>
                    {openDetails[item.id] ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  {openDetails[item.id] && (
                    <div className="p-4 space-y-4 bg-white border-t border-slate-100 animate-in fade-in duration-150">
                      {sections.map((section, sIdx) => (
                        <div key={sIdx} className="space-y-1">
                          <h4 className="text-xs font-bold text-slate-900">
                            {section.heading}
                          </h4>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {section.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Accordion 2: Study Limitations */}
                {result.limitations && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleAccordion(setOpenLimitations, item.id)}
                      className="w-full px-4 py-2.5 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between text-left cursor-pointer transition-colors"
                    >
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                        Study Limitations & Evidence Gaps
                      </span>
                      {openLimitations[item.id] ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </button>

                    {openLimitations[item.id] && (
                      <div className="p-4 bg-white border-t border-slate-100 text-xs text-slate-600 leading-relaxed animate-in fade-in duration-150">
                        {result.limitations}
                      </div>
                    )}
                  </div>
                )}

                {/* Accordion 3: How this was generated */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleAccordion(setOpenMethodology, item.id)}
                    className="w-full px-4 py-2.5 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between text-left cursor-pointer transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-slate-500" />
                      How this was generated (Zero Hallucination Guardrails)
                    </span>
                    {openMethodology[item.id] ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  {openMethodology[item.id] && (
                    <div className="p-4 bg-white border-t border-slate-100 text-xs text-slate-600 leading-relaxed space-y-1.5 animate-in fade-in duration-150">
                      <p>
                        This summary was produced strictly through Veridoc's real-time clinical verification pipeline:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-slate-500 pl-1">
                        <li>PubMed query executed against 36M+ peer-reviewed MEDLINE citations.</li>
                        <li>FDA package insert queried for approved indications and black box warnings.</li>
                        <li>Citation verification algorithm dropped any citation not in the retrieved PubMed set.</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* 6. Action row: Copy, PDF, Bookmark, Follow-up, Re-check, Regenerate */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const fullText = `${result.title}\n\nMain Answer: ${oneLiner}\n\nKey Points:\n` +
                        keyPoints.map(kp => `- ${kp.label}: ${kp.text}`).join('\n');
                      handleCopyText(fullText, `full-${item.id}`);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedKey === `full-${item.id}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(item)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5 text-slate-500" />
                    <span>PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleBookmark(item.id)}
                    className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      bookmarkedIds.has(item.id)
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${bookmarkedIds.has(item.id) ? 'fill-amber-500 text-amber-600' : 'text-slate-500'}`} />
                    <span>{bookmarkedIds.has(item.id) ? 'Saved' : 'Bookmark'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.querySelector('input[type="text"]');
                      if (input) {
                        input.focus();
                        input.value = `What about in children or elderly patients?`;
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>Follow-up</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onRecheck && onRecheck(item)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Re-check PubMed for newer trials"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Re-check</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onRegenerate && onRegenerate(item)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Regenerate synthesis"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Regenerate</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Slim one-line bottom notice */}
      <div className={`py-2 px-4 rounded-xl border text-center text-[11px] font-medium transition-colors duration-300 ${
        isStudent
          ? 'bg-indigo-50/70 border-indigo-200/60 text-indigo-950'
          : 'bg-teal-50/70 border-teal-200/60 text-teal-900'
      }`}>
        {isStudent
          ? 'Medical learning resource. Synthesized strictly from peer-reviewed PubMed trials and guidelines for study and revision.'
          : 'Decision support only. Synthesized strictly from peer-reviewed PubMed and FDA labeling data. Not a substitute for licensed clinical judgment.'}
      </div>
    </div>
  );
}
