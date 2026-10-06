import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { evidenceService } from '../services/api';
import WarningBanner from '../components/WarningBanner';
import EvidenceBadge from '../components/EvidenceBadge';
import CitationChip from '../components/CitationChip';
import ReferenceModal from '../components/ReferenceModal';
import {
  ArrowLeft,
  Clock,
  RotateCw,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
  HelpCircle,
  FileText,
  AlertOctagon,
  BookOpen,
  User,
  CheckCircle2,
  MinusCircle
} from 'lucide-react';

export default function ResultDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [selectedReference, setSelectedReference] = useState(null);

  useEffect(() => {
    async function loadDetail() {
      setLoading(true);
      setError(null);
      try {
        const item = await evidenceService.getHistoryItem(id);
        setData(item);
      } catch (err) {
        console.error('Failed to load item:', err);
        setError('Evidence record could not be loaded or has been deleted.');
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [id]);

  const handleCopySummary = () => {
    if (!data) return;
    const { question, result, references, searchedAt } = data;

    let text = `VERIDOC CLINICAL EVIDENCE SUMMARY\n`;
    text += `Inquiry: ${question}\n`;
    text += `Date: ${new Date(searchedAt).toLocaleString()}\n\n`;
    text += `BOTTOM LINE:\n${result.bottomLine}\n\n`;
    text += `KEY FINDINGS:\n`;
    result.findings.forEach((f, i) => {
      text += `${i + 1}. [${f.evidenceStrength}] ${f.claim} (PMID: ${f.pmids.join(', ')})\n   Rationale: ${f.reason}\n\n`;
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

  const handleRecheck = async () => {
    if (!data) return;
    setRechecking(true);
    try {
      const updated = await evidenceService.recheck(data.id);
      setData(updated);
      alert('PubMed re-check complete! Fresh evidence retrieved and verified.');
    } catch (err) {
      alert(err.response?.data?.error || 'Re-check failed. Please check network connectivity.');
    } finally {
      setRechecking(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this evidence record?')) return;
    try {
      await evidenceService.deleteHistoryItem(data.id);
      navigate('/history');
    } catch (err) {
      alert('Failed to delete query record.');
    }
  };

  const handleCitationClick = (pmid) => {
    if (!data) return;
    const found = data.references.find(r => String(r.pmid) === String(pmid));
    if (found) {
      setSelectedReference(found);
    } else {
      window.open(`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-3 border-teal-200 border-t-[#0F766E] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading saved clinical inquiry...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-base font-semibold text-red-600">{error || 'Record not found'}</p>
        <Link
          to="/history"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to History</span>
        </Link>
      </div>
    );
  }

  const { question, result, references, searchedAt } = data;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Navigation & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/history"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0F766E] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inquiry Audit</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRecheck}
            disabled={rechecking}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-teal-50 hover:text-[#0F766E] border border-slate-300 rounded-lg transition"
          >
            <RotateCw className={`w-3.5 h-3.5 ${rechecking ? 'animate-spin text-[#0F766E]' : ''}`} />
            <span>{rechecking ? 'Re-checking...' : 'Re-check PubMed'}</span>
          </button>

          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Inquiry Title Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0F766E] mb-2">
          <span>Clinical Question</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] leading-relaxed">
          {question}
        </h1>
      </div>

      {/* Warning Banner */}
      <WarningBanner />

      {/* Insufficient Evidence Notice */}
      {result.insufficientEvidence && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 flex items-start gap-3.5 text-amber-900">
          <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Insufficient Published Evidence</h4>
            <p className="text-xs sm:text-sm mt-1 leading-relaxed">
              Retrieved PubMed literature does not meet clinical certainty thresholds.
            </p>
          </div>
        </div>
      )}

      {/* Patient Context Profile Bar (if context was recorded) */}
      {(patientContext?.age || patientContext?.sex || patientContext?.comorbidities || patientContext?.medications) && (
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
            {patientContext.age && (
              <span className="bg-white px-2.5 py-1 rounded-lg border border-teal-200/70 font-medium text-slate-800 shadow-2xs">
                <strong className="text-slate-500">Age:</strong> {patientContext.age}
              </span>
            )}
            {patientContext.sex && (
              <span className="bg-white px-2.5 py-1 rounded-lg border border-teal-200/70 font-medium text-slate-800 shadow-2xs">
                <strong className="text-slate-500">Sex:</strong> {patientContext.sex}
              </span>
            )}
            {patientContext.comorbidities && (
              <span className="bg-white px-2.5 py-1 rounded-lg border border-teal-200/70 font-medium text-slate-800 shadow-2xs">
                <strong className="text-slate-500">Dx:</strong> {patientContext.comorbidities}
              </span>
            )}
            {patientContext.medications && (
              <span className="bg-white px-2.5 py-1 rounded-lg border border-teal-200/70 font-medium text-slate-800 shadow-2xs">
                <strong className="text-slate-500">Rx:</strong> {patientContext.medications}
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

          <button
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
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

        <div className="mt-5 text-lg sm:text-[19px] text-[#0F172A] leading-relaxed font-serif-clinical">
          {result.bottomLine}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-y-2 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Searched on{' '}
              <strong className="text-slate-700">
                {new Date(searchedAt).toLocaleDateString('en-US', {
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
              {references.length} papers evaluated
            </span>
          </div>

          <div className="text-slate-400 italic">
            Based on abstracts only
          </div>
        </div>
      </div>

      {/* Graded Clinical Findings */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-5">
        <h3 className="text-lg font-bold text-[#0F172A]">
          Graded Clinical Findings
        </h3>

        <div className="space-y-4">
          {result.findings && result.findings.length > 0 ? (
            result.findings.map((f, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/40 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <EvidenceBadge strength={f.evidenceStrength} />
                  <span className="text-xs text-slate-400 font-medium">Finding #{idx + 1}</span>
                </div>

                <div className="text-base font-semibold text-[#0F172A] leading-relaxed">
                  {f.claim}
                </div>

                {f.reason && (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-slate-800">Rationale:</strong> {f.reason}
                  </p>
                )}

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
              No discrete findings recorded.
            </div>
          )}
        </div>
      </div>

      {/* Conflicts & Limitations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Where Sources Disagree &amp; Nuances</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {result.conflicts || 'No cross-trial contradictions identified.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>Trial Limitations &amp; Scope</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {result.limitations || 'Findings derived from available abstracts.'}
          </p>
        </div>
      </div>

      {/* Verified References */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#0F172A]">
            Verified PubMed Reference Base ({references.length})
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {references.map((ref, idx) => (
            <div
              key={ref.pmid}
              className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">[{idx + 1}]</span>
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

                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>{ref.journal}</span>
                  <span>•</span>
                  <span>{ref.publicationDate || ref.year}</span>
                </div>
              </div>

              <a
                href={ref.pubmedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-slate-400 hover:text-[#0F766E] hover:bg-teal-50 rounded-lg transition shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {selectedReference && (
        <ReferenceModal
          article={selectedReference}
          onClose={() => setSelectedReference(null)}
        />
      )}
    </div>
  );
}
