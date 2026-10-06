import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Search, Filter, ExternalLink, BookmarkCheck, Sparkles, BookMarked, ArrowRight } from 'lucide-react';

export default function LibraryPage() {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState('all'); // all | papers | books
  const [activeTopic, setActiveTopic] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const topics = ['All', 'Cardiology', 'Nephrology', 'Endocrinology', 'Critical Care', 'Pharmacotherapy'];

  const libraryItems = [
    {
      id: 'lib_1',
      type: 'book',
      source: 'NCBI Bookshelf',
      title: 'StatPearls: Heart Failure with Reduced Ejection Fraction (HFrEF)',
      authors: 'Malik A, Brito D, Vaqar S, et al.',
      year: '2024',
      topic: 'Cardiology',
      summary: 'Comprehensive clinical guide on guideline-directed medical therapy (GDMT), quadruple therapy titration, and contraindications in systolic heart failure.',
      url: 'https://www.ncbi.nlm.nih.gov/books/NBK470438/',
      badge: 'NCBI Clinical Guide'
    },
    {
      id: 'lib_2',
      type: 'paper',
      source: 'PubMed Meta-Analysis',
      title: 'SGLT2 Inhibitors and Cardiovascular Outcomes in Patients with Heart Failure: A Meta-Analysis',
      authors: 'Zannad F, Ferreira JP, Pocock SJ, et al.',
      year: '2024',
      topic: 'Cardiology',
      summary: 'Pooled individual-level analysis of randomized trials confirming sustained reduction in cardiovascular death and all-cause hospitalization across varied ejection fractions.',
      pmid: '38345521',
      url: 'https://pubmed.ncbi.nlm.nih.gov/38345521/',
      badge: 'Meta-Analysis'
    },
    {
      id: 'lib_3',
      type: 'book',
      source: 'NCBI Bookshelf',
      title: 'StatPearls: Chronic Kidney Disease: Staging and Pharmacologic Management',
      authors: 'Vaidya SR, Aeddula NR',
      year: '2024',
      topic: 'Nephrology',
      summary: 'Evidence-based algorithms for RAAS inhibition, SGLT2i renal protection, and monitoring serum potassium and eGFR trajectories.',
      url: 'https://www.ncbi.nlm.nih.gov/books/NBK535404/',
      badge: 'NCBI Clinical Guide'
    },
    {
      id: 'lib_4',
      type: 'paper',
      source: 'PubMed RCT',
      title: 'Semaglutide in Patients with Obesity and Heart Failure: The STEP-HFpEF Trial',
      authors: 'Kosiborod MN, Abildstrøm SZ, Borlaug BA, et al.',
      year: '2024',
      topic: 'Endocrinology',
      summary: 'Double-blind randomized trial demonstrating significant improvements in KCCQ clinical summary scores and 6-minute walk distance.',
      pmid: '38416629',
      url: 'https://pubmed.ncbi.nlm.nih.gov/38416629/',
      badge: 'Randomized Controlled Trial'
    },
    {
      id: 'lib_5',
      type: 'paper',
      source: 'PubMed Review',
      title: 'Dual Antiplatelet Therapy Duration Following Percutaneous Coronary Intervention: An Evidence Review',
      authors: 'Valgimigli M, Bueno H, Byrne RA, et al.',
      year: '2023',
      topic: 'Cardiology',
      summary: 'Systematic review of shortened vs prolonged DAPT strategies tailored by PRECISE-DAPT and ARC-HBR bleeding risk scores.',
      pmid: '37777123',
      url: 'https://pubmed.ncbi.nlm.nih.gov/37777123/',
      badge: 'Systematic Review'
    }
  ];

  const filteredItems = libraryItems.filter((item) => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesTopic = activeTopic === 'All' || item.topic === activeTopic;
    const matchesSearch = searchTerm === '' ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesTopic && matchesSearch;
  });

  const handleAskVeridoc = (item) => {
    const prompt = item.type === 'book'
      ? `What are the latest clinical recommendations regarding ${item.title.replace(/^StatPearls:\s*/, '')}?`
      : `Synthesize the clinical findings and evidence strength from ${item.title}`;
    navigate(`/?q=${encodeURIComponent(prompt)}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F766E]">
                <BookOpen className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-[#0F172A]">Clinical Library</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Curated peer-reviewed publications and NCBI Bookshelf clinical reference manuals.
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search library..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#0F766E] focus:bg-white text-xs outline-none transition-all"
            />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {/* Topic chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTopic(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  activeTopic === t
                    ? 'bg-[#0F766E] text-white shadow-2xs font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Type Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium text-slate-600">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-md transition-all ${filterType === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'hover:text-slate-900'}`}
            >
              All Sources
            </button>
            <button
              onClick={() => setFilterType('papers')}
              className={`px-3 py-1 rounded-md transition-all ${filterType === 'papers' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'hover:text-slate-900'}`}
            >
              PubMed Papers
            </button>
            <button
              onClick={() => setFilterType('books')}
              className={`px-3 py-1 rounded-md transition-all ${filterType === 'books' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'hover:text-slate-900'}`}
            >
              NCBI Bookshelf
            </button>
          </div>
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-teal-200 transition-all duration-150"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    item.type === 'book'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-teal-50 text-teal-700 border-teal-200'
                  }`}>
                    {item.badge}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {item.source} • {item.year}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {item.topic}
                  </span>
                </div>

                <h2 className="text-sm sm:text-base font-bold text-slate-900 hover:text-[#0F766E] transition-colors">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                    <span>{item.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 inline shrink-0" />
                  </a>
                </h2>

                <p className="text-xs text-slate-500 font-medium">
                  {item.authors}
                </p>

                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  {item.summary}
                </p>
              </div>

              {/* Action Button: Ask Veridoc about this */}
              <div className="sm:self-center shrink-0">
                <button
                  onClick={() => handleAskVeridoc(item)}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-[#0F766E] text-[#0F766E] hover:text-white border border-teal-200 hover:border-transparent text-xs font-semibold transition-all duration-150 shadow-2xs group"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-600 group-hover:text-cyan-200" />
                  <span>Ask Veridoc about this</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
