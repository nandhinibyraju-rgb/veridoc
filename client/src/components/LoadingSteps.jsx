import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Award, CheckCircle2, Loader2 } from 'lucide-react';

const STEPS = [
  {
    id: 1,
    title: 'Searching PubMed...',
    description: 'Querying NCBI E-utilities live for trials, meta-analyses, and practice guidelines',
    icon: Search
  },
  {
    id: 2,
    title: 'Reading abstracts...',
    description: 'Parsing publication types, screening retractions, and ranking evidence hierarchies',
    icon: BookOpen
  },
  {
    id: 3,
    title: 'Grading evidence...',
    description: 'Synthesizing clinical findings, assigning GRADE strength, and verifying citations',
    icon: Award
  }
];

export default function LoadingSteps({ currentStep = 1 }) {
  const [internalStep, setInternalStep] = useState(1);

  // Progressive timer for realistic medical step progression if waiting for live PubMed response
  useEffect(() => {
    const timer1 = setTimeout(() => setInternalStep(2), 2200);
    const timer2 = setTimeout(() => setInternalStep(3), 5200);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const activeStep = Math.max(currentStep, internalStep);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-8 shadow-sm max-w-2xl mx-auto my-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-[#0F766E] mb-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#0F766E]" />
        </div>
        <h3 className="text-lg font-bold text-[#0F172A]">Synthesizing Clinical Evidence</h3>
        <p className="text-sm text-slate-500 mt-1">
          Accessing peer-reviewed literature from the National Library of Medicine
        </p>
      </div>

      <div className="space-y-4">
        {STEPS.map((step) => {
          const StepIcon = step.icon;
          const isDone = activeStep > step.id;
          const isCurrent = activeStep === step.id;
          const isPending = activeStep < step.id;

          return (
            <div
              key={step.id}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-300 ${
                isCurrent
                  ? 'bg-teal-50/60 border-teal-200 shadow-2xs'
                  : isDone
                  ? 'bg-slate-50/60 border-slate-200 text-slate-700'
                  : 'bg-white border-dashed border-slate-200 opacity-50'
              }`}
            >
              <div
                className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-medium text-sm transition-colors ${
                  isDone
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : isCurrent
                    ? 'bg-[#0F766E] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <StepIcon className="w-4 h-4" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4
                    className={`text-sm font-semibold ${
                      isCurrent
                        ? 'text-[#0F766E]'
                        : isDone
                        ? 'text-[#0F172A]'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.title}
                  </h4>
                  {isDone && (
                    <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                      Verified
                    </span>
                  )}
                  {isCurrent && (
                    <span className="text-[11px] font-semibold text-[#0F766E] uppercase tracking-wider animate-pulse">
                      Processing
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
