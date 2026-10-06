import React from 'react';
import { Shield, Lock, EyeOff, Database, CheckCircle2, FileText, AlertCircle } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F766E]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Privacy & Clinical Safety Architecture</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Zero-PHI storage, encrypted SQLite sessions, and PubMed citation grounding.
            </p>
          </div>
        </div>
      </div>

      {/* Safety Policy Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6 text-xs text-slate-600 leading-relaxed">
        <section className="space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Lock className="w-4 h-4 text-[#0F766E]" />
            <h2>Zero Protected Health Information (PHI) Principle</h2>
          </div>
          <p>
            Veridoc is designed strictly for peer-reviewed literature synthesis. We enforce that clinicians never submit identifiable patient information (such as names, dates of birth, MRNs, or addresses). The optional Patient Context is restricted to non-identifiable parameters (e.g., "Age 65, Male, eGFR 42").
          </p>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Database className="w-4 h-4 text-[#0F766E]" />
            <h2>Local Encrypted Database & Retention</h2>
          </div>
          <p>
            Clinician accounts and session records reside within a secure, file-based SQLite database with WAL journaling. Passwords use salted bcrypt hashes with cost factor 10, and tokens expire in 7 days. Clinicians retain full ownership of their search history with one-click full deletion anytime in Settings.
          </p>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <EyeOff className="w-4 h-4 text-[#0F766E]" />
            <h2>No Commercial Data Mining or Public Sharing</h2>
          </div>
          <p>
            Veridoc never sells, monetizes, or publicly broadcasts clinical queries. There are no social feeds, public comments, or referral mechanisms. Private notes added to abstracts are encrypted and accessible only to the authenticated clinician.
          </p>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <AlertCircle className="w-4 h-4 text-[#0F766E]" />
            <h2>Clinical Decision Support Disclaimer</h2>
          </div>
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 font-medium">
            <strong>Decision Support Only:</strong> Veridoc is an evidence discovery and summarization platform for licensed clinicians and medical trainees. Summaries are derived strictly from retrieved PubMed abstracts. Veridoc does not diagnose, prescribe, or replace individual medical evaluation and clinician judgment.
          </div>
        </section>
      </div>
    </div>
  );
}
