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
  GraduationCap
} from 'lucide-react';
import jsPDF from 'jspdf';
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

  const [copiedSectionIndex, setCopiedSectionIndex] = useState(null);
  const [copiedAnswerId, setCopiedAnswerId] = useState(null);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [hoveredCitation, setHoveredCitation] = useState(null);

  // Student mode interactive states
  const [openMechanisms, setOpenMechanisms] = useState({});
  const [activeKeyTermId, setActiveKeyTermId] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});

  const toggleMechanism = (id) => {
    setOpenMechanisms((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id]
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

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedSectionIndex(id);
    setTimeout(() => setCopiedSectionIndex(null), 2000);
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

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const sections = result.sections || [];
    sections.forEach((s) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 118, 110);
      doc.text(s.heading, margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const splitText = doc.splitTextToSize(s.text, 180);
      doc.text(splitText, margin, y);
      y += splitText.length * 5 + 4;
    });

    if (result.thingsToWatch && result.thingsToWatch.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9);
      doc.text('Things to Watch:', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      result.thingsToWatch.forEach((tw) => {
        const twText = doc.splitTextToSize(`• ${tw}`, 180);
        doc.text(twText, margin, y);
        y += twText.length * 5;
      });
      y += 4;
    }

    if (y > 250) {
      doc.addPage();
      y = 20;
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

  return (
    <div className="space-y-8 pb-32">
      {thread.map((item, qIdx) => {
        const result = item.data?.result || {};
        const references = item.data?.references || [];
        const sections = result.sections || [];
        const thingsToWatch = result.thingsToWatch || [];
        const counter = `Q${qIdx + 1}/${thread.length}`;

        return (
          <div key={item.id || qIdx} className="space-y-5">
            {/* 1. User question bubble (right-aligned, teal/indigo pill) */}
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

            {/* Answer Block */}
            <div className={`bg-white rounded-2xl border transition-all duration-300 space-y-6 ${
              isStudent
                ? 'p-6 sm:p-8 border-indigo-100/90 shadow-sm'
                : 'p-5 sm:p-7 border-slate-200/90 shadow-xs'
            }`}>
              {/* 2. Interpreted as chip */}
              {result.interpretedAs && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                  isStudent
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                    : 'bg-cyan-50 border-cyan-200 text-cyan-900'
                }`}>
                  <Pill className={`w-3.5 h-3.5 ${isStudent ? 'text-indigo-600' : 'text-[#0F766E]'}`} />
                  <span>
                    Interpreted as: <strong className="font-semibold">{result.interpretedAs}</strong>
                  </span>
                </div>
              )}

              {/* 3. Answer title with topic illustration */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                  isStudent
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                    : 'bg-teal-50 border-teal-200 text-[#0F766E]'
                }`}>
                  {isStudent ? (
                    <GraduationCap className="w-5 h-5 stroke-[2.2]" />
                  ) : (
                    <Stethoscope className="w-5 h-5 stroke-[2.2]" />
                  )}
                </div>
                <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${
                  isStudent ? 'text-indigo-900' : 'text-[#0F766E]'
                }`}>
                  {result.title || 'Clinical Evidence Synthesis'}
                </h1>
              </div>

              {/* Patient context badge if present (Doctor Mode Only) */}
              {!isStudent && item.data?.patientContext && Object.values(item.data.patientContext).some(Boolean) && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Tailored for: <strong>{[item.data.patientContext.age ? `Age ${item.data.patientContext.age}` : null, item.data.patientContext.sex, item.data.patientContext.comorbidities].filter(Boolean).join(', ')}</strong>
                  </span>
                </div>
              )}

              {/* STUDENT MODE COMPONENT 1: "In simple words" */}
              {isStudent && (result.simpleWords || result.bottomLine) && (
                <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>In Simple Words</span>
                  </div>
                  <p className="text-sm sm:text-base text-indigo-950/90 leading-relaxed font-medium">
                    {result.simpleWords || result.bottomLine}
                  </p>
                </div>
              )}

              {/* STUDENT MODE COMPONENT 2: "How it works" (Mechanism of Action - Collapsible) */}
              {isStudent && result.mechanism && (
                <div className="rounded-2xl border border-indigo-200/90 bg-white overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={() => toggleMechanism(item.id)}
                    className="w-full px-4 sm:px-5 py-3 bg-indigo-50/60 hover:bg-indigo-50 flex items-center justify-between transition-colors text-left cursor-pointer"
                  >
                    <span className="text-xs sm:text-sm font-bold text-indigo-950 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-indigo-600" />
                      How It Works (Mechanism of Action)
                    </span>
                    {openMechanisms[item.id] !== false ? (
                      <ChevronUp className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-indigo-600" />
                    )}
                  </button>
                  {openMechanisms[item.id] !== false && (
                    <div className="p-4 sm:p-5 border-t border-indigo-100 bg-white text-xs sm:text-sm text-slate-700 leading-relaxed animate-in fade-in duration-200">
                      <p>{result.mechanism}</p>
                    </div>
                  )}
                </div>
              )}

              {/* STUDENT MODE COMPONENT 3: "Key terms" interactive glossary chips */}
              {isStudent && result.keyTerms && result.keyTerms.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Key Terms (Click for definition)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.keyTerms.map((kt, ktIdx) => {
                      const termKey = `${item.id}-kt-${ktIdx}`;
                      const isTermActive = activeKeyTermId === termKey;
                      return (
                        <div key={ktIdx} className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveKeyTermId(isTermActive ? null : termKey)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                              isTermActive
                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                : 'bg-white hover:bg-indigo-50 text-indigo-900 border-indigo-200 shadow-2xs'
                            }`}
                          >
                            <span>{kt.term}</span>
                            <HelpCircle className={`w-3 h-3 ${isTermActive ? 'text-indigo-200' : 'text-indigo-400'}`} />
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

              {/* 4. Numbered sections with bold headings and small copy icon */}
              <div className="space-y-5">
                {sections.map((section, sIdx) => {
                  const sectionCopyKey = `${item.id}-sec-${sIdx}`;
                  return (
                    <div key={sIdx} className="space-y-1.5 group">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm sm:text-base font-bold text-slate-900">
                          {section.heading}
                        </h2>
                        <button
                          onClick={() => handleCopyText(`${section.heading}\n${section.text}`, sectionCopyKey)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                          title="Copy section"
                        >
                          {copiedSectionIndex === sectionCopyKey ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Section text with 5. INLINE CITATIONS in author-year style (DM Sans 17px generous line height) */}
                      <p className="text-[17px] leading-[1.75] text-slate-700 font-normal">
                        {section.text}{' '}
                        {section.citations && section.citations.length > 0 && (
                          <span className="inline-flex flex-wrap items-center gap-1.5 ml-1">
                            {section.citations.map((citId, cIdx) => {
                              const label = getCitationLabel(citId, references);
                              const refData = getCitationReference(citId, references);
                              const isHovered = hoveredCitation === `${sIdx}-${citId}`;

                              return (
                                <span key={cIdx} className="relative inline-block">
                                  <button
                                    type="button"
                                    onClick={() => onCitationClick && onCitationClick(citId)}
                                    onMouseEnter={() => setHoveredCitation(`${sIdx}-${citId}`)}
                                    onMouseLeave={() => setHoveredCitation(null)}
                                    className={`inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-md cursor-pointer transition-all ${
                                      String(activeCitationId) === String(citId)
                                        ? 'bg-cyan-200 text-slate-900 ring-2 ring-[#0F766E]'
                                        : 'bg-teal-50 hover:bg-teal-100 text-[#0F766E] border border-teal-200/80 hover:border-teal-300'
                                    }`}
                                  >
                                    {label}
                                  </button>

                                  {/* Tooltip on hover */}
                                  {isHovered && refData && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-slate-900 text-white rounded-xl shadow-xl text-[11px] z-50 pointer-events-none animate-in fade-in duration-150">
                                      <p className="font-semibold line-clamp-2 leading-snug">
                                        {refData.title}
                                      </p>
                                      <div className="mt-1 flex items-center justify-between text-[10px] text-teal-300">
                                        <span>{refData.journal}</span>
                                        <span className="flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                          verified on PubMed
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </span>
                              );
                            })}
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* 6. Doctor Mode: "Things to watch" & evidence confidence badge */}
              {!isStudent && thingsToWatch.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                      Things to watch
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      result.evidenceConfidence === 'High'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : result.evidenceConfidence === 'Moderate'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-orange-100 text-orange-800 border-orange-300'
                    }`}>
                      {result.evidenceConfidence || 'Moderate'} Evidence Certainty
                    </span>
                  </div>
                  <ul className="space-y-1 text-xs text-amber-900/90 list-disc list-inside">
                    {thingsToWatch.map((item, idx) => (
                      <li key={idx} className="leading-snug">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* STUDENT MODE COMPONENT 4: "Remember this" flashcard takeaway box */}
              {isStudent && (result.rememberThis || result.bottomLine) && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50 via-amber-50/70 to-indigo-50/50 border-2 border-amber-300 shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                    <Lightbulb className="w-4 h-4 text-amber-600 fill-amber-400" />
                    <span>Remember This (High-Yield Clinical Pearl)</span>
                  </div>
                  <p className="text-sm sm:text-base font-semibold text-slate-800 leading-snug">
                    {result.rememberThis || result.bottomLine}
                  </p>
                </div>
              )}

              {/* STUDENT MODE COMPONENT 5: "Test yourself" 3 interactive practice questions */}
              {isStudent && result.quiz && result.quiz.length > 0 && (
                <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/80 border border-indigo-200/90 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Test Yourself: Practice Questions</h3>
                        <p className="text-[11px] text-slate-500 font-medium">Verify your understanding against the retrieved PubMed abstract evidence</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                      {result.quiz.length} Questions
                    </span>
                  </div>

                  <div className="space-y-4">
                    {result.quiz.map((q, qIdx) => {
                      const qKey = `${item.id}-quiz-${qIdx}`;
                      const answered = quizAnswers[qKey];
                      return (
                        <div key={qIdx} className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-3 shadow-2xs">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                            <span className="text-indigo-600 font-extrabold mr-1">Q{qIdx + 1}.</span> {q.question}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt, optIdx) => {
                              const isSelected = answered?.selected === optIdx;
                              const isCorrectOption = optIdx === q.correctIndex;
                              let btnStyle = "bg-slate-50 hover:bg-indigo-50/70 border-slate-200 text-slate-700";
                              if (answered) {
                                if (isCorrectOption) {
                                  btnStyle = "bg-emerald-50 border-emerald-400 text-emerald-900 font-bold shadow-2xs";
                                } else if (isSelected) {
                                  btnStyle = "bg-red-50 border-red-300 text-red-900";
                                } else {
                                  btnStyle = "bg-slate-50/60 border-slate-200 text-slate-400 opacity-60";
                                }
                              }

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  disabled={Boolean(answered)}
                                  onClick={() => handleQuizSelect(qKey, optIdx, q.correctIndex)}
                                  className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-start gap-2 cursor-pointer ${btnStyle}`}
                                >
                                  <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] shrink-0 font-bold">
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span className="flex-1 leading-snug">{opt}</span>
                                  {answered && isCorrectOption && (
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                  )}
                                  {answered && isSelected && !isCorrectOption && (
                                    <X className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {answered && (
                            <div className={`p-3 rounded-xl text-xs leading-relaxed animate-in fade-in duration-150 ${
                              answered.isCorrect ? 'bg-emerald-50 text-emerald-950 border border-emerald-200' : 'bg-amber-50 text-amber-950 border border-amber-200'
                            }`}>
                              <strong className="block mb-0.5 font-bold">
                                {answered.isCorrect ? '✓ Correct! Well done.' : '✗ Key Explanation:'}
                              </strong>
                              <p>{q.explanation}</p>
                              {references[0] && (
                                <div className="mt-1.5 pt-1.5 border-t border-current/20 text-[11px] opacity-90 flex items-center gap-1 font-medium">
                                  <span>Evidence abstract citation:</span>
                                  <button
                                    type="button"
                                    onClick={() => onCitationClick && onCitationClick(references[0].pmid)}
                                    className="underline font-semibold cursor-pointer hover:opacity-100"
                                  >
                                    {references[0].title ? `PMID ${references[0].pmid} (${references[0].title.slice(0, 40)}...)` : `PMID ${references[0].pmid}`}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 7. Under each answer, an action row: Copy, Download PDF, Bookmark, Re-check, Regenerate */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => {
                      const fullSummary = `${result.title}\n\n` + sections.map(s => `${s.heading}\n${s.text}`).join('\n\n');
                      handleCopyText(fullSummary, `full-${item.id}`);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedSectionIndex === `full-${item.id}` ? (
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
                    onClick={() => handleDownloadPdf(item)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    onClick={() => handleToggleBookmark(item.id)}
                    className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      bookmarkedIds.has(item.id)
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${bookmarkedIds.has(item.id) ? 'fill-amber-500 text-amber-600' : 'text-slate-500'}`} />
                    <span>{bookmarkedIds.has(item.id) ? 'Bookmarked' : 'Bookmark'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onRecheck && onRecheck(item)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Re-query PubMed for newer publications"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Re-check</span>
                  </button>

                  <button
                    onClick={() => onRegenerate && onRegenerate(item)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Regenerate clinical synthesis"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* 8. Slim one-line bottom banner */}
      <div className={`py-2.5 px-4 rounded-xl border text-center text-[11px] font-medium transition-colors duration-300 ${
        isStudent
          ? 'bg-indigo-50/70 border-indigo-200/60 text-indigo-950'
          : 'bg-teal-50/70 border-teal-200/60 text-teal-900'
      }`}>
        {isStudent
          ? 'Medical learning resource. Synthesized strictly from peer-reviewed PubMed trials and guidelines for study and exam revision purposes.'
          : 'Decision support only. Synthesized strictly from peer-reviewed PubMed and FDA labeling data. Not a substitute for licensed clinical judgment.'}
      </div>
    </div>
  );
}
