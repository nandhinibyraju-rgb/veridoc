import React from 'react';
import { CheckCircle2, ExternalLink } from 'lucide-react';

export default function CitationChip({ pmid, onClick, showVerifiedLabel = true, className = '' }) {
  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick(pmid);
    }
  };

  const url = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`PMID: ${pmid} — Verified on NCBI PubMed. Click to view paper abstract.`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50/80 text-[#0F766E] border border-teal-200/90 hover:bg-teal-100 hover:border-teal-300 transition-colors shadow-2xs cursor-pointer group ${className}`}
    >
      <CheckCircle2 className="w-3.5 h-3.5 text-[#0F766E] stroke-[2.5]" />
      <span className="font-semibold tracking-tight">PMID {pmid}</span>
      {showVerifiedLabel && (
        <span className="text-[10px] text-teal-700/80 hidden sm:inline border-l border-teal-200 pl-1.5">
          verified
        </span>
      )}
    </button>
  );
}
