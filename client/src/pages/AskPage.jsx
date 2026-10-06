import React, { useState } from 'react';
import { evidenceService } from '../services/api';
import WarningBanner from '../components/WarningBanner';
import EvidenceBadge from '../components/EvidenceBadge';
import CitationChip from '../components/CitationChip';
import LoadingSteps from '../components/LoadingSteps';
import ReferenceModal from '../components/ReferenceModal';
import {
  Search,
  Sparkles,
  Copy,
  Check,
  Clock,
  BookOpen,
  AlertTriangle,
  ExternalLink,
  RotateCcw,
  Send,
  HelpCircle,
  FileText,
  AlertOctagon,
  ChevronRight,
  ShieldCheck,
  User,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  MinusCircle,
  CheckCircle2
} from 'lucide-react';

const EXAMPLE_QUESTIONS = [
  "In type 2 diabetics with CKD, do SGLT2 inhibitors reduce cardiovascular events vs placebo?",
  "Does early dual antiplatelet therapy with aspirin and clopidogrel reduce recurrent stroke risk after minor ischemic stroke?",
  "In patients with resistant hypertension, does spironolactone outperform other fourth-line antihypertensive agents?"
];

export default function AskPage() {
  const [question, setQuestion] = useState('');
  const [showPatientContext, setShowPatientContext] = useState(false);
  const [patientContext, setPatientContext] = useState({
    age: '',
    sex: '',
    comorbidities: '',
    medications: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [evidenceData, setEvidenceData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [selectedReference, setSelectedReference] = useState(null);

  // Follow-up question state (Phase 3 stretch)
  const [followupText, setFollowupText] = useState('');
  const [followupLoading, setFollowupLoading] = useState(false);
  const [followupResults, setFollowupResults] = useState([]);

  const hasPatientContext = Boolean(
    patientContext.age.trim() ||
    patientContext.sex.trim() ||
    patientContext.comorbidities.trim() ||
    patientContext.medications.trim()
  );

  const handleAsk = async (queryText) => {
    const q = queryText || question;
    if (!q || q.trim().length < 5) return;

    setLoading(true);
    setError(null);
    setEvidenceData(null);
    setFollowupResults([]);

    try {
      const contextPayload = hasPatientContext ? patientContext : undefined;
      const data = await evidenceService.ask(q.trim(), contextPayload);
      setEvidenceData(data);
    } catch (err) {
      console.error('Ask error:', err);
      setError(
        err.response?.data?.error ||
        err.response?.data?.details ||
        'Unable to complete evidence synthesis. Please check PubMed connectivity and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (ex) => {
    setQuestion(ex);
    handleAsk(ex);
  };

  const handleCopySummary = () => {
    if (!evidenceData) return;
    const { question: q, result, references, searchedAt, patientContext: ctx } = evidenceData;

    let text = `VERIDOC CLINICAL EVIDENCE SUMMARY\n`;
    text += `Inquiry: ${q}\n`;
    if (ctx && (ctx.age || ctx.sex || ctx.comorbidities || ctx.medications)) {
      text += `Patient Profile: Age: ${ctx.age || 'N/A'}, Sex: ${ctx.sex || 'N/A'}, Comorbidities: ${ctx.comorbidities || 'N/A'}, Meds: ${ctx.medications || 'N/A'}\n`;
    }
    text += `Date: ${new Date(searchedAt).toLocaleString()}\n\n`;
    text += `BOTTOM LINE:\n${result.bottomLine}\n\n`;
    text += `KEY FINDINGS:\n`;
    result.findings.forEach((f, i) => {
      text += `${i + 1}. [${f.evidenceStrength}] ${f.claim} (PMID: ${f.pmids.join(', ')})\n   Rationale: ${f.reason}\n`;
      if (f.applicability) {
        text += `   Applies to patient: ${f.applicability.status} — ${f.applicability.note}\n`;
      }
      text += `\n`;
    });
    if (result.conflicts) {
      text += `WHERE SOURCES DISAGREE:\n${result.conflicts}\n\n`;
    }
    if (result.limitations) {
      text += `LIMITATIONS:\n${result.limitations}\n\n`;
    }
    text += `REFERENCES (PubMed Verified):\n`;
    references.forEach((r, i) => {
      text += `[${i + 1}] PMID ${r.pmid}: ${r.title} (${r.journal}, ${r.publicationDate || r.year})\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCitationClick = (pmid) => {
    if (!evidenceData) return;
    const found = evidenceData.references.find(r => String(r.pmid) === String(pmid));
    if (found) {
      setSelectedReference(found);
    } else {
      window.open(`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`, '_blank');
    }
  };

  const handleFollowupSubmit = async (e) => {
    e.preventDefault();
    if (!followupText.trim() || !evidenceData?.id) return;

    setFollowupLoading(true);
    try {
      const res = await evidenceService.followup(evidenceData.id, followupText.trim());
      setFollowupResults(prev => [...prev, res]);
      setFollowupText('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit follow-up inquiry.');
    } finally {
      setFollowupLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Search Input Section */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0F766E] mb-2">
            <Sparkles className="w-4 h-4" />
            <span>PubMed-Verified Clinical Query</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight mb-2">
            Ask a Clinical Question
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            Get an instant synthesis of recent RCTs, systematic reviews, and guidelines with GRADE-graded evidence strength and verifiable PubMed citations.
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleAsk(); }} className="space-y-4">
          <div className="relative">
            <textarea
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. In type 2 diabetics with CKD, do SGLT2 inhibitors reduce cardiovascular events vs placebo?"
              className="w-full p-4 pr-32 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent bg-slate-50/50 focus:bg-white resize-none transition shadow-2xs leading-relaxed"
            />
            <div className="absolute right-3 bottom-4 flex items-center gap-2">
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-[#0F766E] hover:bg-[#0d655e] transition disabled:opacity-50 shadow-xs cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>{loading ? 'Synthesizing...' : 'Synthesize'}</span>
              </button>
            </div>
          </div>

          {/* Optional Patient Context Accordion */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowPatientContext(prev => !prev)}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#0F766E] hover:text-[#0d655e] bg-teal-50/70 hover:bg-teal-100/70 border border-teal-200/80 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Patient Context (Optional)</span>
              {hasPatientContext && (
                <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" title="Patient context active" />
              )}
              {showPatientContext ? (
                <ChevronUp className="w-3.5 h-3.5 ml-0.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 ml-0.5 text-slate-400" />
              )}
            </button>

            {showPatientContext && (
              <div className="mt-3 p-4.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>Patient Baseline Profile</span>
                  </span>
                  {hasPatientContext && (
                    <button
                      type="button"
                      onClick={() => setPatientContext({ age: '', sex: '', comorbidities: '', medications: '' })}
                      className="text-[11px] text-slate-500 hover:text-red-600 transition cursor-pointer underline"
                    >
                      Clear context
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Age
                    </label>
                    <input
                      type="text"
                      value={patientContext.age}
                      onChange={(e) => setPatientContext(prev => ({ ...prev, age: e.target.value }))}
                      placeholder="e.g. 68 or >65"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Sex
                    </label>
                    <select
                      value={patientContext.sex}
                      onChange={(e) => setPatientContext(prev => ({ ...prev, sex: e.target.value }))}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                    >
                      <option value="">Unspecified</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Comorbidities
                    </label>
                    <input
                      type="text"
                      value={patientContext.comorbidities}
                      onChange={(e) => setPatientContext(prev => ({ ...prev, comorbidities: e.target.value }))}
                      placeholder="e.g. CKD stage 3b, hypertension"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Current Medications
                    </label>
                    <input
                      type="text"
                      value={patientContext.medications}
                      onChange={(e) => setPatientContext(prev => ({ ...prev, medications: e.target.value }))}
                      placeholder="e.g. Metformin, Lisinopril"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  Findings will evaluate abstract demographics and trial inclusion criteria to indicate whether evidence applies to this specific patient.
                </p>
              </div>
            )}
          </div>
        </form>

        {/* 3 Clickable Example Questions */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
            Click to try clinical questions:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {EXAMPLE_QUESTIONS.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleExampleClick(ex)}
                disabled={loading}
                className="text-left p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-teal-50/50 hover:border-teal-200 text-xs text-slate-700 hover:text-[#0F766E] transition duration-150 leading-relaxed group cursor-pointer"
              >
                <span className="font-semibold text-slate-400 mr-1.5 group-hover:text-[#0F766E]">
                  #{idx + 1}
                </span>
                {ex}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Loading Steps Animation */}
      {loading && <LoadingSteps />}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800 space-y-3">
          <div className="flex items-center gap-2.5 font-semibold text-red-900 text-base">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span>Clinical Evidence Retrieval Error</span>
          </div>
          <p className="text-sm leading-relaxed">{error}</p>
          <button
            onClick={() => handleAsk()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-red-200 rounded-xl text-xs font-semibold text-red-700 hover:bg-red-50 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Search</span>
          </button>
        </div>
      )}

      {/* Evidence Results View */}
      {evidenceData && !loading && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Visible Clinical Warning Banner */}
          <WarningBanner />

          {/* Insufficient Evidence State Alert if triggered */}
          {evidenceData.result.insufficientEvidence && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 flex items-start gap-3.5 text-amber-900">
              <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Insufficient Direct Published Evidence</h4>
                <p className="text-xs sm:text-sm mt-1 leading-relaxed">
                  The literature retrieved from PubMed does not currently meet rigorous randomized control or meta-analysis thresholds to establish definitive clinical guidance for this specific inquiry.
                </p>
              </div>
            </div>
          )}

          {/* Patient Context Profile Bar (if context was provided) */}
          {(evidenceData.patientContext?.age || evidenceData.patientContext?.sex || evidenceData.patientContext?.comorbidities || evidenceData.patientContext?.medications) && (
            <div className="bg-teal-50/80 border border-teal-200/90 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center text-[#0F766E] shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                    Tailored Patient Profile
                  </h4>
                  <p className="text-xs text-slate-500">
                    Clinical findings evaluated against this patient's demographics &amp; comorbidities
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {evidenceData.patientContext.age && (
                  <span className="bg-white px-2.5 py-1 rounded-lg border border-teal-200/70 font-medium text-slate-800 shadow-2xs">
                    <strong className="text-slate-500">Age:</strong> {evidenceData.patientContext.age}
                  </span>
                )}
                {evidenceData.patientContext.sex && (
                  <span className="bg-white px-2.5 py-1 rounded-lg border border-teal-200/70 font-medium text-slate-800 shadow-2xs">
                    <strong className="text-slate-500">Sex:</strong> {evidenceData.patientContext.sex}
                  </span>
                )}
                {evidenceData.patientContext.comorbidities && (
                  <span className="bg-white px-2.5 py-1 rounded-lg border border-teal-200/70 font-medium text-slate-800 shadow-2xs">
                    <strong className="text-slate-500">Dx:</strong> {evidenceData.patientContext.comorbidities}
                  </span>
                )}
                {evidenceData.patientContext.medications && (
                  <span className="bg-white px-2.5 py-1 rounded-lg border border-teal-200/70 font-medium text-slate-800 shadow-2xs">
                    <strong className="text-slate-500">Rx:</strong> {evidenceData.patientContext.medications}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Bottom Line Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F766E]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F766E]">
                  Bottom Line Clinical Recommendation
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopySummary}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  title="Copy full clinical summary to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Summary</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Bottom line text in elegant Source Serif typography */}
            <div className="mt-5 text-lg sm:text-[19px] text-[#0F172A] leading-relaxed font-serif-clinical">
              {evidenceData.result.bottomLine}
            </div>

            {/* Metadata Footer: Searched on timestamp + Based on abstracts only */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-y-2 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Searched on{' '}
                  <strong className="text-slate-700">
                    {new Date(evidenceData.searchedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </strong>
                </span>
                <span className="text-slate-300">•</span>
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-semibold">
                  {evidenceData.articleCount || evidenceData.references.length} papers evaluated
                </span>
              </div>

              <div className="text-slate-400 italic">
                Note: Evidence synthesis is based on peer-reviewed abstracts only
              </div>
            </div>
          </div>

          {/* Graded Clinical Findings Section */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">
                  Graded Clinical Findings
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Specific therapeutic claims graded via GRADE criteria and linked to verified PubMed studies
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {evidenceData.result.findings && evidenceData.result.findings.length > 0 ? (
                evidenceData.result.findings.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50/80 transition space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <EvidenceBadge strength={f.evidenceStrength} />
                      <div className="text-xs text-slate-400 font-medium">
                        Finding #{idx + 1}
                      </div>
                    </div>

                    <div className="text-base font-semibold text-[#0F172A] leading-relaxed">
                      {f.claim}
                    </div>

                    {f.reason && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        <strong className="text-slate-800">Rationale:</strong> {f.reason}
                      </p>
                    )}

                    {/* Verified Citation Chips */}
                    {f.pmids && f.pmids.length > 0 && (
                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-slate-500">Citations:</span>
                        {f.pmids.map((pmid) => (
                          <CitationChip
                            key={pmid}
                            pmid={pmid}
                            onClick={handleCitationClick}
                          />
                        ))}
                      </div>
                    )}

                    {/* Applies to this patient? note */}
                    {f.applicability && (
                      <div className="pt-3 mt-1 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-start gap-2 bg-white/70 p-3 rounded-lg border border-slate-100">
                        <span className="text-xs font-semibold text-slate-700 shrink-0 mt-0.5">
                          Applies to this patient?
                        </span>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {f.applicability.status === 'Applicable' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-[#16A34A] border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                                Applicable
                              </span>
                            )}
                            {f.applicability.status === 'Partially' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-[#CA8A04] border border-amber-200">
                                <MinusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                                Partially
                              </span>
                            )}
                            {f.applicability.status === 'Not studied in this population' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                                Not studied in this population
                              </span>
                            )}
                          </div>
                          {f.applicability.note && (
                            <p className="text-xs text-slate-600 leading-relaxed italic">
                              {f.applicability.note}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm">
                  No discrete findings extracted from available abstracts.
                </div>
              )}
            </div>
          </div>

          {/* Where Sources Disagree & Limitations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Where Sources Disagree */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center">
                  <HelpCircle className="w-3.5 h-3.5" />
                </div>
                <span>Where Sources Disagree &amp; Nuances</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {evidenceData.result.conflicts || 'No direct cross-trial contradictions identified among the retrieved high-evidence cohorts.'}
              </p>
            </div>

            {/* Limitations & Population Considerations */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span>Trial Limitations &amp; Scope</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {evidenceData.result.limitations || 'Findings subject to trial inclusion criteria, exclusion of advanced end-stage renal disease, and follow-up duration.'}
              </p>
            </div>
          </div>

          {/* Guideline Consensus Card if present */}
          {evidenceData.result.guidelineNotes && (
            <div className="bg-white rounded-2xl border border-teal-100 shadow-sm p-6 space-y-2">
              <div className="flex items-center gap-2 text-[#0F766E] font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
                <span>Guideline Consensus &amp; Practice Recommendations</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {evidenceData.result.guidelineNotes}
              </p>
            </div>
          )}

          {/* Verified PubMed Reference List */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">
                  Verified PubMed Reference Base
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real PubMed data retrieved from NCBI E-utilities. Click any study to view the full abstract.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-teal-50 text-[#0F766E] border border-teal-200">
                {evidenceData.references.length} Verified Sources
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {evidenceData.references.map((ref, idx) => (
                <div
                  key={ref.pmid}
                  className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4 group"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">
                        [{idx + 1}]
                      </span>
                      <CitationChip
                        pmid={ref.pmid}
                        onClick={handleCitationClick}
                        showVerifiedLabel={false}
                      />
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {ref.studyType}
                      </span>
                      {ref.isOlderThan5Years && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          Older evidence (&gt;5 yrs)
                        </span>
                      )}
                      {ref.isRetracted && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300">
                          Retracted
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedReference(ref)}
                      className="text-left font-semibold text-sm text-[#0F172A] hover:text-[#0F766E] transition leading-snug cursor-pointer block"
                    >
                      {ref.title}
                    </button>

                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>{ref.journal}</span>
                      <span>•</span>
                      <span>{ref.publicationDate || ref.year}</span>
                    </div>
                  </div>

                  <a
                    href={ref.pubmedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open on official PubMed website"
                    className="p-2 text-slate-400 hover:text-[#0F766E] hover:bg-teal-50 rounded-lg transition-colors shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Phase 3 Stretch: Follow-Up Questions on Result */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-5">
            <div>
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#0F766E]" />
                <span>Ask a Follow-Up Question</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Deep dive into specific subgroup outcomes, renal endpoints, dosage, or drug safety profiles.
              </p>
            </div>

            <form onSubmit={handleFollowupSubmit} className="flex gap-2">
              <input
                type="text"
                value={followupText}
                onChange={(e) => setFollowupText(e.target.value)}
                placeholder="e.g. What were the specific eGFR slope findings?"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E] bg-slate-50/50 focus:bg-white"
              />
              <button
                type="submit"
                disabled={followupLoading || !followupText.trim()}
                className="px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#0F766E] hover:bg-[#0d655e] transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{followupLoading ? 'Querying...' : 'Ask Follow-up'}</span>
              </button>
            </form>

            {/* Follow-up answers list */}
            {followupResults.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                {followupResults.map((fr, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-teal-50/40 border border-teal-200/60 space-y-2">
                    <div className="text-xs font-bold text-[#0F766E]">
                      Q: {fr.followupQuestion}
                    </div>
                    <div className="text-sm text-slate-800 leading-relaxed font-serif-clinical">
                      {fr.result?.bottomLine}
                    </div>
                    {fr.result?.findings?.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {fr.result.findings.map((f, fi) => (
                          <div key={fi} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="font-semibold text-slate-900">•</span>
                            <span>{f.claim}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Abstract Inspection Modal */}
      {selectedReference && (
        <ReferenceModal
          article={selectedReference}
          onClose={() => setSelectedReference(null)}
        />
      )}
    </div>
  );
}
