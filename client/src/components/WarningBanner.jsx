import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function WarningBanner({ className = '' }) {
  return (
    <div
      role="alert"
      className={`bg-amber-50 border border-amber-200/90 rounded-xl p-3.5 flex items-center gap-3 text-amber-900 text-sm font-medium shadow-xs ${className}`}
    >
      <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 border border-amber-300/60">
        <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
      </div>
      <div className="flex-1 text-xs sm:text-sm">
        <span className="font-semibold text-amber-950">Clinical Advisory:</span> Decision support only. Not a substitute for clinical judgment, individualized patient evaluation, or hospital guideline protocols.
      </div>
    </div>
  );
}
