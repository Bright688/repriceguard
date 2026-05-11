'use client';
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Finding } from '@/types';
import { SeverityBadge } from './SeverityBadge';

function CodeBlock({ code, variant }: { code: string; variant: 'bad' | 'good' }) {
  const bg = variant === 'bad' ? 'bg-red-500/[0.04]' : 'bg-emerald-500/[0.04]';
  const border = variant === 'bad' ? 'border-red-500/20' : 'border-emerald-500/20';
  const label = variant === 'bad' ? '✗ Vulnerable Pattern' : '✓ Recommended Fix';
  const labelColor = variant === 'bad' ? 'text-red-400' : 'text-emerald-400';
  return (
    <div className={`rounded border ${border} ${bg} overflow-hidden mb-3`}>
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/5 bg-black/20">
        <span className="text-xs font-mono tracking-widest uppercase text-[#8a9fb5]">Solidity</span>
        <span className="text-sm font-mono font-semibold ${labelColor}">{label}</span>
      </div>
      <pre className="text-sm leading-relaxed font-mono text-[#c9d6e8]/80 px-4 py-3.5 overflow-x-auto whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}

export function FindingCard({ finding, defaultOpen = false }: { finding: Finding; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[#1c2535] last:border-0 transition-colors hover:bg-white/[0.015]">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-4 px-6 py-5 text-left group"
      >
        <SeverityBadge severity={finding.severity} />
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-[#c9d6e8] mb-1 leading-snug">{finding.title}</div>
          <div className="text-sm font-mono text-[#8a9fb5]">
            {finding.eips.join(' · ')} · {finding.hits.length} occurrence{finding.hits.length !== 1 ? 's' : ''} found
          </div>
        </div>
        <ChevronRight
          size={16}
          className={`text-[#8a9fb5] flex-shrink-0 mt-0.5 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {/* Body */}
      {open && (
        <div className="px-6 pb-6">
          {/* Description */}
          <p
            className="text-sm text-[#a0b3c5] leading-relaxed mb-5 font-sans"
            dangerouslySetInnerHTML={{ __html: finding.description }}
          />

          {/* Occurrences */}
          {finding.hits.length > 0 && (
            <div className="mb-5 rounded border border-[#1c2535] overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2 bg-[#111823] border-b border-[#1c2535]">
                <span className="text-xs font-mono tracking-widest uppercase text-[#8a9fb5]">Detected Occurrences</span>
                <span className="text-sm font-mono text-[#a0b3c5]">{finding.hits.length} match{finding.hits.length !== 1 ? 'es' : ''}</span>
              </div>
              <div className="divide-y divide-[#1c2535]/60">
                {finding.hits.slice(0, 4).map((hit, i) => (
                  <div key={i} className="flex items-start gap-3 px-3.5 py-2.5 text-sm font-mono">
                    <span className="text-[#8a9fb5] flex-shrink-0 tabular-nums w-12">Line {hit.line}</span>
                    <span className="text-amber-400/80 truncate">{hit.text}</span>
                  </div>
                ))}
                {finding.hits.length > 4 && (
                  <div className="px-3.5 py-2 text-sm font-mono text-[#8a9fb5]">
                    +{finding.hits.length - 4} more occurrences
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gas Impact */}
          {finding.gasImpact.old !== finding.gasImpact.new && (
            <div className="flex gap-8 mb-5 flex-wrap">
              <div>
                <div className="text-xs font-mono tracking-widest uppercase text-[#8a9fb5] mb-1">Before Glamsterdam</div>
                <div className="font-serif text-3xl text-[#a0b3c5]">{finding.gasImpact.old.toLocaleString()}</div>
              </div>
              <div className="self-end text-[#8a9fb5] mb-1 text-xl">→</div>
              <div>
                <div className="text-xs font-mono tracking-widest uppercase text-[#8a9fb5] mb-1">After Glamsterdam</div>
                <div className={`font-serif text-3xl font-bold ${finding.gasImpact.direction === 'up' ? 'text-red-400' : 'text-emerald-400'}`}>
                  {finding.gasImpact.new.toLocaleString()}
                </div>
              </div>
              <div className="self-end mb-1">
                <div className="text-xs font-mono tracking-widest uppercase text-[#8a9fb5] mb-1">Context</div>
                <div className="text-sm text-[#a0b3c5]">{finding.gasImpact.note}</div>
              </div>
            </div>
          )}

          {/* Code examples */}
          <CodeBlock code={finding.codeExample.bad} variant="bad" />
          <CodeBlock code={finding.codeExample.good} variant="good" />

          {/* Remediation */}
          <div className="rounded border border-emerald-500/15 bg-emerald-500/[0.03] p-4">
            <div className="text-xs font-mono tracking-widest uppercase text-emerald-500 mb-2">⬡ Remediation</div>
            <p
              className="text-sm text-[#a0b3c5] leading-relaxed font-sans"
              dangerouslySetInnerHTML={{ __html: finding.remediation }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
