'use client';

import { useState, useRef } from 'react';
import type { ScanResult } from '@/types';
import { ScanPanel } from '@/components/ScanPanel';
import { ScanResults } from '@/components/ScanResults';

const EIP_PILLS = [
  { label: 'EIP-2780 · TX Base Gas', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/[0.06]' },
  { label: 'EIP-7904 · Opcode Repricing', color: 'border-amber-500/30 text-amber-400 bg-amber-500/[0.05]' },
  { label: 'EIP-8037 · State Creation ×10', color: 'border-red-500/30 text-red-400 bg-red-500/[0.05]' },
  { label: 'EIP-8038 · Cold Access', color: 'border-[#1c2535] text-[#5a7090] bg-[#0d1117]' },
  { label: 'EIP-7708 · Transfer Logs', color: 'border-[#1c2535] text-[#5a7090] bg-[#0d1117]' },
];

const HOW_STEPS = [
  { num: '01', title: 'Parse Input', desc: 'Accepts Solidity source, contract addresses (Etherscan API), or raw bytecode.' },
  { num: '02', title: 'Static Analysis', desc: 'Pattern-matches against dangerous gas constants: 21000, 9000, 2300, .transfer(), .send().' },
  { num: '03', title: 'Apply EIP Rules', desc: 'Each pattern is mapped to EIP-2780, EIP-7904, EIP-8037, or EIP-8038 for exact gas deltas.' },
  { num: '04', title: 'Generate Report', desc: 'Severity-scored report with code locations, gas tables, and remediation — as JSON or web UI.' },
];

const EIP_REF = [
  { id: 'EIP-2780', title: 'Reduce Intrinsic Transaction Gas', status: 'CFI', summary: 'TX_BASE_COST: 21,000 → 4,500. ETH transfer to existing EOA: 21,000 → 7,756. To new account: 31,756 (+51%). CALL_VALUE_COST: 9,000 → 3,756.' },
  { id: 'EIP-7904', title: 'General Opcode Repricing', status: 'CFI', summary: '18+ opcodes repriced via client benchmarks (Jan 2026 data). Targets operations below 60 MGas/s. KECCAK256 base: 30 → 50.' },
  { id: 'EIP-8037', title: 'State Creation Gas Cost Increase', status: 'CFI', summary: 'Introduces state_gas metering. Contract deployments ~10× more expensive. New account creation ~8.5×. Factory contracts with fixed gas budgets will fail.' },
  { id: 'EIP-8038', title: 'State-Access Gas Cost Increase', status: 'CFI', summary: 'Cold SLOAD: 2,100 → 3,000 (+43%). Cold account/storage reads priced to reflect real I/O overhead.' },
  { id: 'EIP-7708', title: 'ETH Transfers Emit a Log', status: 'CFI', summary: 'Every non-zero ETH transfer emits a LOG3 event, adding TRANSFER_LOG_COST = 1,756 gas. Embedded in EIP-2780 accounting.' },
];

export default function Home() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleResult = (r: ScanResult) => {
    setResult(r);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  return (
    <div className="relative z-10 min-h-screen">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 border-b border-[#1c2535] bg-[#080b10]/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg border border-emerald-500/60 flex items-center justify-center text-emerald-400 text-sm font-bold relative">
            ⬡
            <span className="absolute inset-[3px] rounded border border-emerald-500/20" />
          </div>
          <span className="font-serif text-2xl font-bold text-[#c9d6e8]">
            Reprice<span className="text-emerald-400">Guard</span>
          </span>
        </div>
        <div className="flex items-center gap-5">
          <span className="text-xs font-mono tracking-[0.2em] uppercase text-emerald-400 border border-emerald-500/30 bg-emerald-500/[0.05] px-3 py-1.5 rounded">
            Glamsterdam Upgrade
          </span>
          <a href="#how" className="text-sm font-mono tracking-widest uppercase text-white hover:text-emerald-400 transition-colors">How it Works</a>
          <a href="#eips" className="text-sm font-mono tracking-widest uppercase text-white hover:text-emerald-400 transition-colors">EIPs</a>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="max-w-6xl mx-auto px-8 pt-20 pb-16 text-center">
        <div className="animate-fadeUp flex items-center justify-center gap-3 mb-10 text-sm font-mono tracking-[0.2em] uppercase text-[#3d5068]">
          <span className="w-8 h-px bg-[#1c2535]" />
          Ethereum Foundation · Glamsterdam Readiness Tool
          <span className="w-8 h-px bg-[#1c2535]" />
        </div>

        <h1 className="animate-fadeUp-d1 font-serif font-bold leading-[1.05] tracking-tight mb-6"
            style={{ fontSize: 'clamp(48px, 6.5vw, 80px)' }}>
          Scan your contracts for<br />
          <span className="text-emerald-400 italic">gas repricing</span> vulnerabilities
        </h1>

        <p className="animate-fadeUp-d2 font-mono text-base text-[#5a7090] leading-relaxed max-w-3xl mx-auto mb-10">
          Glamsterdam changes the cost of nearly every on-chain operation.{' '}
          <strong className="text-[#c9d6e8]">EIP-2780 drops TX_BASE_COST from 21,000 to 4,500</strong>
          {' '}— but sending to a new account now costs 31,756 (+51%).{' '}
          <strong className="text-[#c9d6e8]">EIP-8037 raises contract deployment ~10×.</strong>{' '}
          RepriceGuard detects every hardcoded gas pattern that will break.
        </p>

        <div className="animate-fadeUp-d3 flex justify-center flex-wrap gap-2 mb-16">
          {EIP_PILLS.map(p => (
            <span key={p.label} className={`text-xs font-mono px-4 py-2 rounded border ${p.color}`}>
              {p.label}
            </span>
          ))}
        </div>
      </section>

      {/* ── SCAN PANEL ── */}
      <div className="animate-fadeUp-d4 max-w-6xl mx-auto px-8 mb-16">
        <ScanPanel onResult={handleResult} />
      </div>

      {/* ── RESULTS ── */}
      {result && (
        <div ref={resultsRef} className="max-w-6xl mx-auto px-8 mb-20">
          <ScanResults result={result} />
        </div>
      )}

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="max-w-6xl mx-auto px-8 mb-20">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-5 h-px bg-emerald-400" />
          <span className="text-sm font-mono tracking-[0.2em] uppercase text-[#3d5068]">How RepriceGuard Works</span>
          <div className="flex-1 h-px bg-[#1c2535]" />
        </div>
        <h2 className="font-serif text-4xl font-bold text-[#c9d6e8] mb-8 tracking-tight">
          From source to vulnerability report
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 border border-[#1c2535] rounded-xl overflow-hidden">
          {HOW_STEPS.map((s, i) => (
            <div key={s.num} className={`p-6 ${i < 3 ? 'border-r border-[#1c2535]' : ''}`}>
              <div className="font-serif text-5xl font-bold text-[#1c2535] mb-4 leading-none">{s.num}</div>
              <div className="font-mono text-base font-semibold text-[#c9d6e8] mb-2">{s.title}</div>
              <div className="font-mono text-sm text-[#3d5068] leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── EIP REFERENCE ── */}
      <section id="eips" className="max-w-6xl mx-auto px-8 mb-24">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-5 h-px bg-emerald-400" />
          <span className="text-sm font-mono tracking-[0.2em] uppercase text-[#3d5068]">EIP Reference</span>
          <div className="flex-1 h-px bg-[#1c2535]" />
        </div>
        <h2 className="font-serif text-4xl font-bold text-[#c9d6e8] mb-8 tracking-tight">
          The Glamsterdam Gas Repricing Bundle
        </h2>
        <div className="border border-[#1c2535] rounded-xl overflow-hidden divide-y divide-[#1c2535]">
          {EIP_REF.map(eip => (
            <div key={eip.id} className="grid grid-cols-[140px_1fr_auto] gap-5 items-center px-6 py-5 hover:bg-white/[0.015] transition-colors">
              <div className="font-mono text-base font-semibold text-emerald-400">{eip.id}</div>
              <div>
                <div className="font-mono text-base font-semibold text-[#c9d6e8] mb-1">{eip.title}</div>
                <div className="font-mono text-sm text-[#3d5068] leading-relaxed">{eip.summary}</div>
              </div>
              <span className="text-xs font-mono tracking-widest uppercase px-3 py-1.5 rounded border border-amber-500/30 text-amber-400 bg-amber-500/[0.06] whitespace-nowrap">
                {eip.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#1c2535] bg-[#0d1117] px-8 py-8 flex items-center justify-between flex-wrap gap-4">
        <div className="font-serif text-xl font-bold text-emerald-400">RepriceGuard</div>
        <div className="flex gap-6">
          {[
            ['GitHub', 'https://github.com'],
            ['EIP-7773', 'https://eips.ethereum.org/EIPS/eip-7773'],
            ['Checkpoint #9', 'https://blog.ethereum.org/2026/04/10/checkpoint-9'],
          ].map(([label, href]) => (
            <a key={label} href={href} target="_blank"
               className="text-sm font-mono tracking-widest uppercase text-[#8a9fb5] hover:text-emerald-400 transition-colors">
              {label}
            </a>
          ))}
        </div>
        <div className="text-xs font-mono text-[#6a8090]">MIT License · Open Source · Glamsterdam Grants Round 2026</div>
      </footer>
    </div>
  );
}
