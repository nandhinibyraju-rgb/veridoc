import React from 'react';
import { X, HelpCircle, ShieldCheck, Sparkles, BookOpen, Stethoscope } from 'lucide-react';

export default function HelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-end p-4 sm:p-6 pointer-events-none">
      <div
        className="pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F766E] to-[#115E59] px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-cyan-200" />
            </div>
            <div>
              <h2 id="help-modal-title" className="text-sm font-semibold text-white">Veridoc Clinical Guide</h2>
              <p className="text-[11px] text-teal-100">How to use & Privacy FAQ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/15 text-teal-100 hover:text-white transition-colors"
            aria-label="Close help"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4 text-xs text-slate-600">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
              <Stethoscope className="w-4 h-4 text-[#0F766E]" />
              <span>How to ask clinical questions</span>
            </div>
            <p className="leading-relaxed">
              Formulate your query in standard clinical PICO format (Patient, Intervention, Comparison, Outcome) or ask directly. For example: <em>"In adults with HFrEF, what is the impact of adding SGLT2 inhibitors on cardiovascular mortality?"</em>
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
              <Sparkles className="w-4 h-4 text-[#0F766E]" />
              <span>Evidence Grading Framework</span>
            </div>
            <p className="leading-relaxed">
              Veridoc grades evidence using adapted GRADE criteria based on study methodology:
            </p>
            <ul className="space-y-1 list-disc list-inside text-slate-500 pl-1">
              <li><strong className="text-emerald-700">High:</strong> Meta-analyses and large double-blind multicenter RCTs.</li>
              <li><strong className="text-amber-700">Moderate:</strong> Standard RCTs or high-quality prospective cohorts.</li>
              <li><strong className="text-orange-700">Low:</strong> Observational studies or smaller cohorts.</li>
              <li><strong className="text-red-700">Very Low:</strong> Case series, expert opinions, or inconsistent findings.</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
              <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
              <span>Zero-Hallucination Citation Guarantee</span>
            </div>
            <p className="leading-relaxed">
              Every citation chip links directly to its live NCBI PubMed abstract. Any citation not present in the live retrieved set is programmatically purged before display.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
              <BookOpen className="w-4 h-4 text-[#0F766E]" />
              <span>Privacy & Patient Confidentiality</span>
            </div>
            <p className="leading-relaxed">
              Never enter identifiable Patient Health Information (PHI). Patient context is limited to non-identifying clinical variables (age, sex, comorbidities, medications).
            </p>
          </div>

          <div className="p-3 bg-teal-50 border border-teal-200/70 rounded-xl text-[11px] text-teal-800 leading-relaxed font-medium">
            <strong>Decision Support Only:</strong> Veridoc does not replace clinical judgment, licensing, or diagnostic expertise. Always review original peer-reviewed source literature before making treatment decisions.
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-semibold shadow-xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
