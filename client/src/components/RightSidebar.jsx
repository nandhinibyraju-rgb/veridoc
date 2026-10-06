import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, ExternalLink, RefreshCw, ShieldAlert, Award } from 'lucide-react';
import { evidenceService } from '../services/api';

export default function RightSidebar() {
  const [trending, setTrending] = useState([]);
  const [specialties, setSpecialties] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoadingTrending(true);
        const data = await evidenceService.getTrending();
        if (isMounted) {
          setTrending(data.trending || []);
          setSpecialties(data.specialties || '');
        }
      } catch (err) {
        console.warn('Failed to load trending evidence:', err.message);
      } finally {
        if (isMounted) setLoadingTrending(false);
      }

      try {
        setLoadingAlerts(true);
        const alertData = await evidenceService.getAlerts();
        if (isMounted) {
          setAlerts(alertData.alerts || []);
        }
      } catch (err) {
        console.warn('Failed to load safety alerts:', err.message);
      } finally {
        if (isMounted) setLoadingAlerts(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <aside className="hidden xl:block w-80 shrink-0 space-y-6" aria-label="Clinical Highlights and Safety Updates">
      {/* Card 1: Trending Clinical Evidence this Week */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4.5 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F766E]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#0F172A] tracking-tight uppercase">Trending Evidence</h2>
              <p className="text-[10px] text-slate-500 font-medium">Meta-analyses & RCTs this week</p>
            </div>
          </div>
          {specialties && (
            <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 truncate max-w-[100px]" title={specialties}>
              {specialties.split(',')[0]}
            </span>
          )}
        </div>

        {/* Skeleton Loaders */}
        {loadingTrending ? (
          <div className="mt-3 space-y-3">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2 animate-pulse">
                <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                <div className="h-2.5 bg-slate-200 rounded w-1/2"></div>
                <div className="flex justify-between items-center">
                  <div className="h-2 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-2 bg-slate-200 rounded w-1/6"></div>
                </div>
              </div>
            ))}
          </div>
        ) : trending.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No trending articles found for selected specialty.
          </div>
        ) : (
          <div className="mt-3 space-y-2.5">
            {trending.slice(0, 5).map((article, index) => (
              <a
                key={article.pmid || index}
                href={article.pubmedUrl || `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="group block p-2.5 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-teal-50/40 hover:border-teal-200/80 transition-all duration-150"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1">
                    <Award className="w-3 h-3 text-[#0F766E]" />
                    {article.studyType || 'Clinical Trial'}
                  </span>
                  <span className="text-[10px] text-slate-600 font-mono">
                    {article.date || article.year}
                  </span>
                </div>
                <h3 className="mt-1 text-xs font-semibold text-slate-800 group-hover:text-[#0F766E] line-clamp-2 leading-snug">
                  {article.title}
                </h3>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-600">
                  <span className="truncate max-w-[160px] italic">{article.journal}</span>
                  <span className="text-[#0F766E] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-medium">
                    PMID {article.pmid} <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Card 2: Latest Safety Alerts */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4.5 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#0F172A] tracking-tight uppercase">Latest Safety Alerts</h2>
              <p className="text-[10px] text-slate-500 font-medium">FDA / WHO / CDC Clinical Bulletins</p>
            </div>
          </div>
        </div>

        {/* Skeleton Loaders */}
        {loadingAlerts ? (
          <div className="mt-3 space-y-3">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2 animate-pulse">
                <div className="flex justify-between">
                  <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-2.5 bg-slate-200 rounded w-1/4"></div>
                </div>
                <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                <div className="h-2 bg-slate-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No active safety advisories.
          </div>
        ) : (
          <div className="mt-3 space-y-2.5">
            {alerts.map((alert) => (
              <a
                key={alert.id}
                href={alert.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block p-2.5 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-red-50/30 hover:border-red-200/70 transition-all duration-150"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${alert.agencyBadgeColor || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {alert.agency}
                  </span>
                  <span className="text-[10px] text-slate-600">{alert.date}</span>
                </div>
                <h3 className="mt-1.5 text-xs font-semibold text-slate-800 group-hover:text-red-700 line-clamp-2 leading-snug">
                  {alert.title}
                </h3>
                <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-normal">
                  {alert.summary}
                </p>
                <div className="mt-1.5 flex items-center justify-end text-[10px] text-red-600 font-medium group-hover:underline">
                  View Advisory <ExternalLink className="w-2.5 h-2.5 ml-1" />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
