import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Search,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  ExternalLink,
  X,
  ChevronDown,
  FileText,
  ChevronLeft,
  ChevronRight,
  BookMarked,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const INITIAL_LIBRARY = [
  {
    id: 'lib_1',
    type: 'book',
    source: 'NCBI Bookshelf',
    title: 'StatPearls: Heart Failure with Reduced Ejection Fraction (HFrEF)',
    authors: 'Malik A, Brito D, Vaqar S, et al.',
    year: '2024',
    topic: 'Cardiology',
    summary: 'Comprehensive clinical guide detailing quadruple therapy (ARNI, beta-blocker, MRA, SGLT2i), dosing titration protocols, and acute decompensation management.',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK470438/',
    pmid: '29083811',
    badge: 'Book'
  },
  {
    id: 'lib_2',
    type: 'paper',
    source: 'The Lancet',
    title: 'SGLT2 Inhibitors and Cardiovascular Outcomes in Patients with Heart Failure: A Meta-Analysis',
    authors: 'Zannad F, Ferreira JP, Pocock SJ, et al.',
    year: '2024',
    topic: 'Cardiology',
    summary: 'Pooled individual-level analysis of randomized trials demonstrating a 13% reduction in all-cause mortality and 26% reduction in cardiovascular death or HF hospitalization.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/38345521/',
    pmid: '38345521',
    badge: 'Paper'
  },
  {
    id: 'lib_3',
    type: 'book',
    source: 'NCBI Bookshelf',
    title: 'StatPearls: Chronic Kidney Disease: Staging and Pharmacologic Management',
    authors: 'Vaidya SR, Aeddula NR',
    year: '2024',
    topic: 'Nephrology',
    summary: 'Practical clinical algorithms for KDIGO CKD staging, ACEi/ARB optimization, non-steroidal MRA integration, and hyperkalemia mitigation.',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK535404/',
    pmid: '30571025',
    badge: 'Book'
  },
  {
    id: 'lib_4',
    type: 'paper',
    source: 'N Engl J Med',
    title: 'Semaglutide in Patients with Obesity and Heart Failure: The STEP-HFpEF Trial',
    authors: 'Kosiborod MN, Abildstrøm SZ, Borlaug BA, et al.',
    year: '2024',
    topic: 'Endocrinology',
    summary: 'Double-blind RCT showing once-weekly semaglutide 2.4 mg produced larger reductions in symptoms and physical limitations alongside significant weight loss in HFpEF.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/38416629/',
    pmid: '38416629',
    badge: 'Paper'
  },
  {
    id: 'lib_5',
    type: 'paper',
    source: 'Eur Heart J',
    title: 'Dual Antiplatelet Therapy Duration Following Percutaneous Coronary Intervention: An Evidence Review',
    authors: 'Valgimigli M, Bueno H, Byrne RA, et al.',
    year: '2023',
    topic: 'Cardiology',
    summary: 'Systematic evidence appraisal of abbreviated 1-3 month DAPT regimens vs conventional 12-month regimens in patients with high bleeding risk (HBR).',
    url: 'https://pubmed.ncbi.nlm.nih.gov/37777123/',
    pmid: '37777123',
    badge: 'Paper'
  },
  {
    id: 'lib_6',
    type: 'paper',
    source: 'JAMA',
    title: 'Finerenone in Patients with Chronic Kidney Disease and Type 2 Diabetes',
    authors: 'Bakris GL, Agarwal R, Anker SD, et al.',
    year: '2023',
    topic: 'Nephrology',
    summary: 'Analysis from FIDELIO-DKD showing non-steroidal mineralocorticoid receptor antagonism significantly reduces CKD progression and cardiorenal events.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/33095549/',
    pmid: '33095549',
    badge: 'Paper'
  },
  {
    id: 'lib_7',
    type: 'book',
    source: 'NCBI Bookshelf',
    title: 'StatPearls: Acute Respiratory Distress Syndrome (ARDS) Management',
    authors: 'Gorman SK, O\'Callaghan J, et al.',
    year: '2023',
    topic: 'Critical Care',
    summary: 'Evidence-based review of low tidal volume ventilation, prone positioning trial data, neuromuscular blockade, and ECMO indications.',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK436002/',
    pmid: '28613722',
    badge: 'Book'
  },
  {
    id: 'lib_8',
    type: 'paper',
    source: 'Ann Intern Med',
    title: 'Comparative Effectiveness of GLP-1 RAs versus SGLT2 Inhibitors on Renal Outcomes',
    authors: 'Patorno E, Pawar A, Wexler DJ, et al.',
    year: '2022',
    topic: 'Pharmacotherapy',
    summary: 'Population-based cohort study examining preservation of eGFR slope and hard renal end points between modern antidiabetic therapeutic classes.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/35728075/',
    pmid: '35728075',
    badge: 'Paper'
  },
  {
    id: 'lib_9',
    type: 'paper',
    source: 'Circulation',
    title: 'Guideline-Directed Medical Therapy Titration in Heart Failure with Reduced Ejection Fraction',
    authors: 'Greene SJ, Butler J, Fonarow GC',
    year: '2022',
    topic: 'Cardiology',
    summary: 'Consensus review addressing rapid multi-drug initiation versus sequential step-up therapy to optimize survival in ambulatory HFrEF patients.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/34491823/',
    pmid: '34491823',
    badge: 'Paper'
  }
];

export default function LibraryPage() {
  const navigate = useNavigate();
  const { studentMode, appMode } = useAuth();
  const isStudent = studentMode || appMode === 'student';

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeTab, setTypeTab] = useState('all'); // 'all' | 'papers' | 'books' | 'saved'
  const [selectedTopic, setSelectedTopic] = useState('All Topics');
  const [selectedYear, setSelectedYear] = useState('All Years');
  const [selectedSort, setSelectedSort] = useState('newest'); // 'newest' | 'az' | 'relevance'

  // Saved items & user notes stored in localStorage
  const [savedIds, setSavedIds] = useState(() => {
    try {
      const stored = localStorage.getItem('veridoc_saved_ids');
      return stored ? JSON.parse(stored) : ['lib_1', 'lib_4'];
    } catch {
      return ['lib_1', 'lib_4'];
    }
  });

  const [notes, setNotes] = useState(() => {
    try {
      const stored = localStorage.getItem('veridoc_library_notes');
      return stored ? JSON.parse(stored) : {
        'lib_1': 'Key review for cardiology rounds: memorize quadruple therapy starting doses.',
        'lib_4': 'High-yield for exam: STEP-HFpEF trial demonstrated significant KCCQ score improvements.'
      };
    } catch {
      return {};
    }
  });

  // Slide-over drawer state
  const [activeItem, setActiveItem] = useState(null);
  const [currentNoteInput, setCurrentNoteInput] = useState('');

  // Pagination state (6 per page)
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  // Sync saved to localStorage
  useEffect(() => {
    localStorage.setItem('veridoc_saved_ids', JSON.stringify(savedIds));
  }, [savedIds]);

  // Sync notes to localStorage
  useEffect(() => {
    localStorage.setItem('veridoc_library_notes', JSON.stringify(notes));
  }, [notes]);

  const toggleSave = (id, e) => {
    if (e) e.stopPropagation();
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAskVeridoc = (item, e) => {
    if (e) e.stopPropagation();
    const query = item.type === 'book'
      ? `What are the latest clinical recommendations regarding ${item.title.replace(/^StatPearls:\s*/, '')}?`
      : `Synthesize the clinical findings and evidence strength from ${item.title}`;
    navigate(`/?q=${encodeURIComponent(query)}`);
  };

  const handleCardClick = (item) => {
    setActiveItem(item);
    setCurrentNoteInput(notes[item.id] || '');
  };

  const handleSaveNote = () => {
    if (!activeItem) return;
    setNotes((prev) => ({
      ...prev,
      [activeItem.id]: currentNoteInput
    }));
  };

  // Filter & Sort logic
  const filteredItems = useMemo(() => {
    return INITIAL_LIBRARY.filter((item) => {
      // Type Tab filter
      if (typeTab === 'papers' && item.type !== 'paper') return false;
      if (typeTab === 'books' && item.type !== 'book') return false;
      if (typeTab === 'saved' && !savedIds.includes(item.id)) return false;

      // Topic filter
      if (selectedTopic !== 'All Topics' && item.topic !== selectedTopic) return false;

      // Year filter
      if (selectedYear !== 'All Years') {
        if (selectedYear === 'Older') {
          if (parseInt(item.year, 10) >= 2023) return false;
        } else if (item.year !== selectedYear) {
          return false;
        }
      }

      // Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesSummary = item.summary.toLowerCase().includes(query);
        const matchesAuthors = item.authors.toLowerCase().includes(query);
        const matchesTopic = item.topic.toLowerCase().includes(query);
        const matchesNote = (notes[item.id] || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesSummary && !matchesAuthors && !matchesTopic && !matchesNote) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (selectedSort === 'newest') {
        return parseInt(b.year, 10) - parseInt(a.year, 10);
      }
      if (selectedSort === 'az') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [typeTab, selectedTopic, selectedYear, selectedSort, searchTerm, savedIds, notes]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    return filteredItems.slice(0, page * PAGE_SIZE);
  }, [filteredItems, page]);

  const hasMore = paginatedItems.length < filteredItems.length;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header: ONLY Title, subtitle, single search box, and ONE filter row */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        {/* Title, Subtitle, and Single Search Box */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Library</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Verified clinical literature, systematic guidelines, and curated references.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search library..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm outline-none focus:bg-white focus:border-[#0F766E] transition-all"
            />
          </div>
        </div>

        {/* ONE Filter Row: Type tabs + Topic dropdown + Year dropdown + Sort dropdown */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {/* Type Tabs: All, Papers, Books, Saved */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            {[
              { id: 'all', label: 'All' },
              { id: 'papers', label: 'Papers' },
              { id: 'books', label: 'Books' },
              { id: 'saved', label: `Saved (${savedIds.length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setTypeTab(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  typeTab === tab.id
                    ? isStudent
                      ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                      : 'bg-white text-[#0F766E] shadow-2xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Dropdowns Row: Topic, Year, Sort */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Topic Dropdown */}
            <div className="relative">
              <select
                value={selectedTopic}
                onChange={(e) => {
                  setSelectedTopic(e.target.value);
                  setPage(1);
                }}
                className="appearance-none pl-3 pr-8 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-700 outline-none cursor-pointer transition-colors"
              >
                <option value="All Topics">All Topics</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Nephrology">Nephrology</option>
                <option value="Endocrinology">Endocrinology</option>
                <option value="Critical Care">Critical Care</option>
                <option value="Pharmacotherapy">Pharmacotherapy</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Year Dropdown */}
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setPage(1);
                }}
                className="appearance-none pl-3 pr-8 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-700 outline-none cursor-pointer transition-colors"
              >
                <option value="All Years">All Years</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="Older">Older</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={selectedSort}
                onChange={(e) => {
                  setSelectedSort(e.target.value);
                  setPage(1);
                }}
                className="appearance-none pl-3 pr-8 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-700 outline-none cursor-pointer transition-colors"
              >
                <option value="newest">Newest First</option>
                <option value="az">Title (A-Z)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Content: Clean responsive grid of uniform cards (1-col mobile, 2-col tablet, 3-col desktop) */}
      {paginatedItems.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <BookMarked className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">
              {typeTab === 'saved' ? 'No saved items found' : 'No publications matched your filters'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {typeTab === 'saved'
                ? 'Save papers and clinical guides using the bookmark icon to review them here with private study notes.'
                : 'Try adjusting your search query, topic filter, or publication year.'}
            </p>
          </div>
          {(searchTerm || selectedTopic !== 'All Topics' || selectedYear !== 'All Years' || typeTab !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedTopic('All Topics');
                setSelectedYear('All Years');
                setTypeTab('all');
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedItems.map((item) => {
            const isSaved = savedIds.includes(item.id);
            const userNote = notes[item.id];

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => handleCardClick(item)}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-[#0F766E]/50 hover:shadow-sm transition-all duration-200 flex flex-col justify-between cursor-pointer group"
              >
                <div className="space-y-3">
                  {/* Top Row: Type Badge + Year/Source */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        item.type === 'book'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-teal-50 text-[#0F766E] border-teal-200'
                      }`}
                    >
                      {item.badge}
                    </span>

                    <span className="text-[11px] font-medium text-slate-400">
                      {item.source} • {item.year}
                    </span>
                  </div>

                  {/* Title (max 2 lines) */}
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0F766E] transition-colors line-clamp-2 leading-snug">
                    {item.title}
                  </h3>

                  {/* Journal or Publisher and Authors */}
                  <p className="text-[11px] text-slate-400 font-medium truncate">
                    {item.authors}
                  </p>

                  {/* Private note preview if saved and on saved tab */}
                  {typeTab === 'saved' && userNote && (
                    <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200/60 text-[11px] text-amber-900 line-clamp-2 italic">
                      "{userNote}"
                    </div>
                  )}
                </div>

                {/* Bottom Row: One small topic chip + Two icon buttons (Save, Ask Veridoc) */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                    {item.topic}
                  </span>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Save Icon Button */}
                    <button
                      type="button"
                      onClick={(e) => toggleSave(item.id, e)}
                      title={isSaved ? 'Remove from Saved' : 'Save publication'}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isSaved
                          ? 'bg-teal-50 text-[#0F766E] border-teal-200'
                          : 'bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700 border-slate-200'
                      }`}
                    >
                      {isSaved ? <BookmarkCheck className="w-3.5 h-3.5 fill-current" /> : <Bookmark className="w-3.5 h-3.5" />}
                    </button>

                    {/* Ask Veridoc Icon Button */}
                    <button
                      type="button"
                      onClick={(e) => handleAskVeridoc(item, e)}
                      title="Ask Veridoc about this"
                      className="p-2 rounded-xl bg-teal-50 hover:bg-[#0F766E] text-[#0F766E] hover:text-white border border-teal-200 hover:border-transparent transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 3. Pagination or "Load more" button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="px-6 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            Load more publications
          </button>
        </div>
      )}

      {/* 4. Slide-over drawer when card is clicked */}
      <AnimatePresence>
        {activeItem && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveItem(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Slide-over panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="absolute inset-y-0 right-0 max-w-lg w-full bg-white shadow-2xl flex flex-col justify-between z-10"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${
                      activeItem.type === 'book'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-teal-50 text-[#0F766E] border-teal-200'
                    }`}
                  >
                    {activeItem.badge}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {activeItem.source} • {activeItem.year}
                  </span>
                </div>

                <button
                  onClick={() => setActiveItem(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 leading-snug">
                    {activeItem.title}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {activeItem.authors}
                  </p>
                </div>

                {/* Abstract / Summary */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Clinical Abstract & Summary
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {activeItem.summary}
                  </p>
                </div>

                {/* PubMed / NCBI Link */}
                <div className="flex items-center gap-3">
                  <a
                    href={activeItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F766E] hover:underline"
                  >
                    <span>View primary source at {activeItem.source}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  {activeItem.pmid && (
                    <span className="text-xs text-slate-400">
                      PMID: {activeItem.pmid}
                    </span>
                  )}
                </div>

                {/* Private Notes Section */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Private Clinical Notes
                    </label>
                    <span className="text-[11px] text-slate-400">Saved to browser</span>
                  </div>
                  <textarea
                    rows={4}
                    value={currentNoteInput}
                    onChange={(e) => setCurrentNoteInput(e.target.value)}
                    placeholder="Add personal study notes, titration tips, or clinical trial pearls here..."
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-[#0F766E] transition-all"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveNote}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Save note
                    </button>
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
                <button
                  onClick={() => toggleSave(activeItem.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    savedIds.includes(activeItem.id)
                      ? 'bg-white text-[#0F766E] border-teal-300 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {savedIds.includes(activeItem.id) ? (
                    <>
                      <BookmarkCheck className="w-4 h-4 text-[#0F766E] fill-current" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4 text-slate-400" />
                      <span>Bookmark</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleAskVeridoc(activeItem)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0F766E] hover:bg-teal-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>Ask Veridoc</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
