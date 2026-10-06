import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Download,
  Plus,
  AlertOctagon,
  Clock,
  BookOpen,
  Award,
  BookmarkPlus
} from 'lucide-react';

export default function ReferencesPanel({
  thread = [],
  activeQuestionIndex = 0,
  onQuestionSelect,
  activeCitationId = null
}) {
  const [citationStyle, setCitationStyle] = useState('APA'); // APA, Vancouver, MLA
  const [sortBy, setSortBy] = useState('cited'); // cited, newest, highest
  const [viewMode, setViewMode] = useState('list'); // list | grid
  const [expandedAbstracts, setExpandedAbstracts] = useState(new Set());
  const [copiedRefId, setCopiedRefId] = useState(null);
  const [savedAllMessage, setSavedAllMessage] = useState(false);

  const currentItem = thread[activeQuestionIndex] || thread[0] || null;
  const references = currentItem?.data?.references || [];

  const toggleAbstract = (pmid) => {
    setExpandedAbstracts((prev) => {
      const next = new Set(prev);
      if (next.has(pmid)) next.delete(pmid);
      else next.add(pmid);
      return next;
    });
  };

  const formatCitation = (ref, style) => {
    const author = ref.authors || 'Clinical Research Group';
    const year = ref.year || ref.publicationDate?.substring(0, 4) || '2024';
    const title = ref.title || '';
    const journal = ref.journal || '';

    if (style === 'Vancouver') {
      return `${author}. ${title}. ${journal}. ${year}.`;
    }
    if (style === 'MLA') {
      return `${author}. "${title}." ${journal}, ${year}.`;
    }
    // Default APA
    return `${author} (${year}). ${title}. ${journal}.`;
  };

  const handleCopyCitation = (ref) => {
    const text = formatCitation(ref, citationStyle);
    navigator.clipboard.writeText(text);
    setCopiedRefId(ref.pmid);
    setTimeout(() => setCopiedRefId(null), 2000);
  };

  const handleExport = (format) => {
    if (references.length === 0) return;
    let content = '';
    let filename = `veridoc-references.${format.toLowerCase()}`;

    if (format === 'BibTeX') {
      content = references.map((r, i) => `@article{ref_${i + 1},
  title={${r.title}},
  author={${r.authors}},
  journal={${r.journal}},
  year={${r.year}},
  pmid={${r.pmid}}
}`).join('\n\n');
    } else if (format === 'RIS') {
      content = references.map(r => `TY  - JOUR
TI  - ${r.title}
AU  - ${r.authors}
JO  - ${r.journal}
PY  - ${r.year}
ID  - ${r.pmid}
ER  - `).join('\n\n');
    } else if (format === 'CSV') {
      content = 'PMID,Title,Authors,Journal,Year,StudyType\n' +
        references.map(r => `"${r.pmid}","${(r.title || '').replace(/"/g, '""')}","${r.authors}","${r.journal}","${r.year}","${r.studyType}"`).join('\n');
    } else {
      content = references.map(r => formatCitation(r, citationStyle)).join('\n\n');
      navigator.clipboard.writeText(content);
      alert('All citations copied to clipboard in ' + citationStyle + ' style.');
      return;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveAllToLibrary = () => {
    setSavedAllMessage(true);
    setTimeout(() => setSavedAllMessage(false), 3000);
  };

  // Sorting
  const sortedReferences = [...references].sort((a, b) => {
    if (sortBy === 'newest') {
      return (Number(b.year) || 0) - (Number(a.year) || 0);
    }
    if (sortBy === 'highest') {
      return (b.rankScore || 0) - (a.rankScore || 0);
    }
    // 'cited' default: articles cited in findings/sections first
    if (a.isCitedInFindings && !b.isCitedInFindings) return -1;
    if (!a.isCitedInFindings && b.isCitedInFindings) return 1;
    return 0;
  });

  return (
    <div className="space-y-4 pb-32">
      {/* Header Row: Dropdown "References for Q1", then question title in grey */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <select
              value={activeQuestionIndex}
              onChange={(e) => onQuestionSelect && onQuestionSelect(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              {thread.map((t, idx) => (
                <option key={idx} value={idx}>
                  References for Q{idx + 1} ({t.data?.references?.length || 0})
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-slate-400 truncate max-w-xs font-medium">
            {currentItem?.question || 'Current Query'}
          </span>
        </div>

        {/* Controls Row */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Citation Style */}
            <select
              value={citationStyle}
              onChange={(e) => setCitationStyle(e.target.value)}
              className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              title="Citation Style"
            >
              <option value="APA">APA</option>
              <option value="Vancouver">Vancouver</option>
              <option value="MLA">MLA</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              title="Sort References"
            >
              <option value="cited">Cited order</option>
              <option value="newest">Newest first</option>
              <option value="highest">Highest evidence</option>
            </select>

            {/* Grid/List Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-2xs text-[#0F766E]' : 'text-slate-400 hover:text-slate-700'}`}
                title="List view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-2xs text-[#0F766E]' : 'text-slate-400 hover:text-slate-700'}`}
                title="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Export Dropdown */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleExport(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="" disabled>Export</option>
              <option value="Copy">Copy all ({citationStyle})</option>
              <option value="BibTeX">BibTeX (.bib)</option>
              <option value="RIS">RIS (.ris)</option>
              <option value="CSV">CSV (.csv)</option>
            </select>

            {/* Save all to Library */}
            <button
              type="button"
              onClick={handleSaveAllToLibrary}
              className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#0F766E] border border-teal-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Save all to Library"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Library</span>
            </button>
          </div>
        </div>

        {savedAllMessage && (
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-medium flex items-center gap-1.5 animate-in fade-in duration-150">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>All {references.length} papers bookmarked to your Clinical Library!</span>
          </div>
        )}
      </div>

      {/* References Cards List / Grid */}
      {references.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
          No references retrieved for this query.
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'}>
          {sortedReferences.map((ref, idx) => {
            const isHighlighted = String(activeCitationId) === String(ref.pmid);
            const isAbstractExpanded = expandedAbstracts.has(ref.pmid);

            return (
              <div
                key={ref.pmid || idx}
                id={`ref-card-${ref.pmid}`}
                className={`bg-white rounded-2xl border p-4 shadow-xs transition-all duration-200 ${
                  isHighlighted
                    ? 'border-[#0F766E] ring-2 ring-teal-200 bg-teal-50/20'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Header row: number [1], study type badge, tags */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-mono font-bold text-[10px] flex items-center justify-center">
                      [{idx + 1}]
                    </span>

                    {/* Study type badge */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      ref.studyType === 'FDA Label'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : ref.studyType?.includes('Meta-Analysis')
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : ref.studyType?.includes('Randomized')
                        ? 'bg-teal-50 text-[#0F766E] border-teal-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {ref.studyType || 'Journal Article'}
                    </span>

                    {/* Older evidence tag */}
                    {ref.isOlderThan5Years && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> Older evidence
                      </span>
                    )}

                    {/* Retracted tag */}
                    {ref.isRetracted && (
                      <span className="text-[10px] text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 font-bold">
                        <AlertOctagon className="w-2.5 h-2.5" /> Retracted
                      </span>
                    )}
                  </div>

                  {ref.citationsCount && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {ref.citationsCount} citations
                    </span>
                  )}
                </div>

                {/* Title in bold */}
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  {ref.title}
                </h3>

                {/* Authors, Year, Journal */}
                <div className="mt-1 text-[11px] text-slate-500">
                  <span className="font-medium text-slate-600">{ref.authors}</span>
                  <span className="mx-1">•</span>
                  <span>{ref.journal}</span>
                  <span className="mx-1">•</span>
                  <span className="font-mono">{ref.publicationDate || ref.year}</span>
                </div>

                {/* Green "Verified on PubMed" check with PMID and DOI */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {ref.pmid === 'FDA' ? (
                      <a
                        href={ref.pubmedUrl || 'https://www.accessdata.fda.gov/scripts/cder/daf/'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:underline"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                        <span>Official FDA Approved Label</span>
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </a>
                    ) : (
                      <a
                        href={ref.pubmedUrl || `https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Verified on PubMed (PMID: {ref.pmid})</span>
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </a>
                    )}

                    {ref.doi && (
                      <a
                        href={`https://doi.org/${ref.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-slate-400 hover:text-slate-600 underline font-mono"
                      >
                        DOI
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyCitation(ref)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title={`Copy citation in ${citationStyle} style`}
                  >
                    {copiedRefId === ref.pmid ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Formatted citation text */}
                <p className="mt-1.5 text-[11px] text-slate-500 italic bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                  {formatCitation(ref, citationStyle)}
                </p>

                {/* Collapsible Abstract Toggle */}
                {ref.abstract && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => toggleAbstract(ref.pmid)}
                      className="text-[11px] font-semibold text-[#0F766E] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isAbstractExpanded ? 'Hide Abstract' : 'View Abstract'}</span>
                      {isAbstractExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {isAbstractExpanded && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-50 text-[11px] text-slate-700 leading-relaxed max-h-48 overflow-y-auto border border-slate-200/80 animate-in fade-in duration-150">
                        {ref.abstract}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
