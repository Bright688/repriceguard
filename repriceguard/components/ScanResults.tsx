'use client';
import type { ScanResult } from '@/types';
import { SeverityBadge } from './SeverityBadge';
import { GasTable } from './GasTable';
import { FindingCard } from './FindingCard';

interface Props {
  result: ScanResult;
}

const SEV_BOXES = [
  { key: 'critical' as const, label: 'Critical' },
  { key: 'high'     as const, label: 'High'     },
  { key: 'medium'   as const, label: 'Medium'   },
  { key: 'info'     as const, label: 'Info'     },
];

const BOX_STYLES = {
  critical: 'border-red-500/30 bg-red-500/[0.07] text-red-400',
  high:     'border-amber-500/30 bg-amber-500/[0.07] text-amber-400',
  medium:   'border-blue-500/25 bg-blue-500/[0.06] text-blue-400',
  info:     'border-[#1c2535] bg-[#111823] text-[#a0b3c5]',
};

export function ScanResults({ result }: Props) {
  const total = result.counts.critical + result.counts.high + result.counts.medium + result.counts.info;
  const isClean = total === 0;

  return (
    <div className="rounded-xl border border-[#1c2535] overflow-hidden bg-[#0d1117]">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap px-6 py-5 border-b border-[#1c2535] bg-[#080b10]">
        <div>
          <div className="font-serif text-2xl font-bold text-[#c9d6e8] mb-1">
            {isClean ? '✓ No Vulnerabilities Found' : `${total} Issue${total > 1 ? 's' : ''} Detected`}
          </div>
          <div className="text-sm font-mono text-[#8a9fb5]">
            {result.label} · {result.linesAnalyzed} lines analyzed · {new Date(result.scannedAt).toLocaleTimeString()}
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          {SEV_BOXES.map(({ key, label }) => (
            <div key={key} className={`text-center min-w-[70px] px-4 py-3 rounded border ${BOX_STYLES[key]}`}>
              <div className="font-serif text-3xl font-bold leading-none mb-0.5">{result.counts[key]}</div>
              <div className="text-xs font-mono tracking-widest uppercase opacity-70">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Gas Table */}
      <div className="px-6 py-5 border-b border-[#1c2535]">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-mono tracking-widest uppercase text-[#8a9fb5]">
            Gas Cost Comparison — Pre vs Post Glamsterdam
          </span>
          <div className="flex-1 h-px bg-[#1c2535]" />
        </div>
        <GasTable rows={result.gasTable} />
      </div>

      {/* Findings */}
      <div>
        {isClean ? (
          <div className="px-6 py-12 text-center">
            <div className="text-4xl mb-4">✓</div>
            <div className="font-serif text-2xl text-emerald-400 mb-2">No vulnerabilities detected</div>
            <div className="text-sm font-mono text-[#8a9fb5]">
              This contract has no patterns matching Glamsterdam gas repricing vulnerabilities.<br />
              It appears safe to deploy post-upgrade without gas-related changes.
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-6 pt-5 pb-3">
              <span className="text-sm font-mono tracking-widest uppercase text-[#8a9fb5]">
                Vulnerability Details
              </span>
              <div className="flex-1 h-px bg-[#1c2535]" />
              <span className="text-xs font-mono text-[#6a8090]">Click to expand</span>
            </div>
            {result.findings.map((finding, i) => (
              <FindingCard key={finding.id} finding={finding} defaultOpen={i === 0} />
            ))}
          </>
        )}
      </div>

      {/* Export footer */}
      <div className="px-6 py-4 border-t border-[#1c2535] bg-[#080b10] flex items-center justify-between flex-wrap gap-3">
        <div className="text-xs font-mono text-[#6a8090]">
          RepriceGuard v0.1 · EIP-2780 · EIP-7904 · EIP-8037 · EIP-8038
        </div>
        <button
          onClick={() => {
            const json = JSON.stringify(result, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'repriceguard-report.json'; a.click();
            URL.revokeObjectURL(url);
          }}
          className="text-[10px] font-mono tracking-widest uppercase text-[#8a9fb5] border border-[#1c2535] rounded px-3 py-1.5 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
        >
          Export JSON ↓
        </button>
      </div>
    </div>
  );
}
