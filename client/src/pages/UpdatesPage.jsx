import React, { useState, useEffect } from 'react';
import { BellRing, ShieldAlert, Award, ExternalLink, Calendar, CheckCircle2 } from 'lucide-react';
import { evidenceService } from '../services/api';

export default function UpdatesPage() {
  const [trending, setTrending] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [trendRes, alertRes] = await Promise.all([
          evidenceService.getTrending(),
          evidenceService.getAlerts()
        ]);
        setTrending(trendRes.trending || []);
        setAlerts(alertRes.alerts || []);
      } catch (err) {
        console.error('Failed to load updates:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F766E]">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Clinical Evidence Updates</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live updates of new meta-analyses, major randomized trials, and regulatory safety bulletins.
            </p>
          </div>
        </div>
      </div>

      {/* Safety Alerts Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
          <ShieldAlert className="w-5 h-5 text-red-600" />
          <h2 className="text-base font-bold text-slate-900">Regulatory & Safety Alerts</h2>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full ml-auto">
            FDA • WHO • CDC
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-red-200 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${alert.agencyBadgeColor || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {alert.agency}
                  </span>
                  <span className="text-xs text-slate-600 font-mono">{alert.date}</span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 leading-snug">{alert.title}</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{alert.summary}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-end">
                <a
                  href={alert.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-red-700 hover:text-red-800 flex items-center gap-1"
                >
                  Read Official Bulletin <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Clinical Trials Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
          <Award className="w-5 h-5 text-[#0F766E]" />
          <h2 className="text-base font-bold text-slate-900">Weekly Evidence Digest</h2>
          <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 ml-auto">
            Live PubMed
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {trending.map((t) => (
              <div
                key={t.pmid}
                className="p-4 rounded-xl border border-slate-200 hover:border-teal-200 bg-slate-50/30 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                      {t.studyType}
                    </span>
                    <span className="text-xs text-slate-600">{t.journal} • {t.date || t.year}</span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">{t.title}</h3>
                  <p className="text-xs text-slate-500">{t.authors}</p>
                </div>

                <a
                  href={t.pubmedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-[#0F766E] text-[#0F766E] hover:text-white border border-teal-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>PMID {t.pmid}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
