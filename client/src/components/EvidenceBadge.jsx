import React from 'react';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

const BADGE_CONFIG = {
  High: {
    bg: 'bg-emerald-50',
    border: 'border-[#16A34A]/30',
    text: 'text-[#16A34A]',
    dot: 'bg-[#16A34A]',
    icon: ShieldCheck,
    label: 'High Certainty'
  },
  Moderate: {
    bg: 'bg-amber-50',
    border: 'border-[#CA8A04]/30',
    text: 'text-[#CA8A04]',
    dot: 'bg-[#CA8A04]',
    icon: Shield,
    label: 'Moderate Certainty'
  },
  Low: {
    bg: 'bg-orange-50',
    border: 'border-[#EA580C]/30',
    text: 'text-[#EA580C]',
    dot: 'bg-[#EA580C]',
    icon: ShieldAlert,
    label: 'Low Certainty'
  },
  'Very Low': {
    bg: 'bg-red-50',
    border: 'border-[#DC2626]/30',
    text: 'text-[#DC2626]',
    dot: 'bg-[#DC2626]',
    icon: ShieldAlert,
    label: 'Very Low Certainty'
  }
};

export default function EvidenceBadge({ strength = 'Moderate', showLabel = true, className = '' }) {
  const normalized = BADGE_CONFIG[strength] ? strength : 'Moderate';
  const config = BADGE_CONFIG[normalized];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.border} ${config.text} ${className}`}
      title={`GRADE Evidence Strength: ${normalized}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{normalized} Evidence</span>
    </span>
  );
}
