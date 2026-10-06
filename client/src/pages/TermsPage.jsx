import React from 'react';
import { FileText, ShieldAlert } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F766E]">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Terms of Service</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Governing use of Veridoc Clinical Evidence Assistant.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5 text-xs text-slate-600 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">1. Nature of the Service</h2>
          <p>
            Veridoc is an AI-assisted search and synthesis interface for biomedical scientific literature indexed in the National Library of Medicine (NCBI PubMed). It provides reference-backed clinical information to aid licensed healthcare practitioners in evidence review.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">2. Medical Disclaimer</h2>
          <p>
            Veridoc is NOT a medical device, diagnostic system, or automated treatment prescriber. All outputs are intended exclusively for professional informational and research reference. Licensed healthcare professionals bear sole responsibility for verifying source citations and exercising clinical judgment.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">3. Citation Grounding & Limitations</h2>
          <p>
            Syntheses are generated from retrieved abstracts and title data. Full-text articles should be accessed via direct PMID/DOI links for complete methodological review before clinical implementation.
          </p>
        </section>
      </div>
    </div>
  );
}
