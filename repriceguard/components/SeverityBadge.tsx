'use client';
import type { Severity } from '@/types';

const CONFIG = {
  critical: { label: 'Critical', bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-400' },
  high:     { label: 'High',     bg: 'bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-400' },
  medium:   { label: 'Medium',   bg: 'bg-blue-500/10', border: 'border-blue-500/40', text: 'text-blue-400' },
  info:     { label: 'Info',     bg: 'bg-slate-700/40', border: 'border-slate-600', text: 'text-slate-400' },
};

export function SeverityBadge({ severity, size = 'sm' }: { severity: Severity; size?: 'sm' | 'lg' }) {
  const c = CONFIG[severity];
  const px = size === 'lg' ? 'px-4 py-2 text-sm' : 'px-3 py-1 text-xs';
  return (
    <span className={`inline-block rounded ${px} font-mono font-semibold tracking-widest uppercase border ${c.bg} ${c.border} ${c.text}`}>
      {c.label}
    </span>
  );
}

export function SeverityDot({ severity }: { severity: Severity }) {
  const colors = { critical: 'bg-red-400', high: 'bg-amber-400', medium: 'bg-blue-400', info: 'bg-slate-500' };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[severity]}`} />;
}
