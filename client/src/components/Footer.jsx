import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, HelpCircle, Shield, FileText, Mail, BookOpen, BellRing } from 'lucide-react';
import HelpModal from './HelpModal';

export default function Footer() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      <footer className="mt-auto border-t border-teal-800/20 bg-gradient-to-r from-teal-950 via-[#0F766E] to-teal-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 pb-6 border-b border-teal-700/30">
            {/* Logo & Tagline */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-teal-800/80 border border-teal-400/40 flex items-center justify-center text-cyan-300 shadow-xs">
                  <Activity className="w-4 h-4 stroke-[2.4]" />
                </div>
                <span className="text-lg font-bold tracking-tight text-white">Veridoc</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                  Clinical
                </span>
              </Link>
              <p className="mt-2 text-xs text-teal-100 max-w-sm leading-relaxed">
                The latest clinical evidence, graded and verified, in seconds. Built for physicians, residents, and clinical scholars.
              </p>
            </div>

            {/* Links */}
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-teal-100">
              <Link to="/library" className="hover:text-cyan-200 transition-colors flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Library</span>
              </Link>
              <Link to="/updates" className="hover:text-cyan-200 transition-colors flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5" />
                <span>Updates</span>
              </Link>
              <Link to="/privacy" className="hover:text-cyan-200 transition-colors flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Privacy and Safety</span>
              </Link>
              <Link to="/terms" className="hover:text-cyan-200 transition-colors flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Terms</span>
              </Link>
              <a
                href="mailto:clinical-support@veridoc.med"
                className="hover:text-cyan-200 transition-colors flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Contact</span>
              </a>
            </nav>
          </div>

          {/* Bottom row: disclaimer & copyright */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-teal-200/90 text-center sm:text-left">
            <div>
              © Veridoc 2026. Peer-reviewed literature indexed live via NCBI PubMed E-utilities.
            </div>
            <div className="font-medium text-teal-100/80 bg-teal-900/40 px-3 py-1 rounded-full border border-teal-700/40">
              Clinical decision support only. Not a substitute for licensed medical judgment.
            </div>
          </div>
        </div>
      </footer>

      {/* Floating help button at bottom right */}
      <button
        onClick={() => setIsHelpOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-[#0F766E] hover:bg-[#0D655E] text-white shadow-lg hover:shadow-cyan-500/20 border border-teal-400/40 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 group"
        aria-label="Open Veridoc Clinical Guide and Privacy FAQ"
        title="Veridoc Clinical Help & Privacy FAQ"
      >
        <HelpCircle className="w-5 h-5 text-cyan-200 group-hover:text-white" />
      </button>

      {/* Floating Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
}
