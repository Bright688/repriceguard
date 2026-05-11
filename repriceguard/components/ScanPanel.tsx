'use client';
import { useState, useRef } from 'react';
import type { ScanResult, ScanMode, ProgressStep } from '@/types';
import { EXAMPLE_CONTRACTS } from '@/lib/examples';

const PROGRESS_STEPS = [
  'Parsing contract structure',
  'Applying EIP-2780 rules',
  'Checking EIP-8037 state costs',
  'Scanning for unsafe patterns',
  'Computing gas deltas',
  'Generating vulnerability report',
];

const EXAMPLES = Object.entries(EXAMPLE_CONTRACTS).map(([key, ex]) => ({
  key, title: ex.title, severity: ex.severity,
}));

interface Props {
  onResult: (result: ScanResult) => void;
}

export function ScanPanel({ onResult }: Props) {
  const [mode, setMode] = useState<ScanMode>('source');
  const [sourceInput, setSourceInput] = useState(EXAMPLE_CONTRACTS.forwarder.source);
  const [addressInput, setAddressInput] = useState('');
  const [bytecodeInput, setBytecodeInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [error, setError] = useState('');
  const abortRef = useRef(false);

  const loadExample = (key: string) => {
    const ex = EXAMPLE_CONTRACTS[key];
    if (!ex) return;
    setSourceInput(ex.source);
    setMode('source');
    setError('');
  };

  const runScan = async () => {
    let input = '';
    if (mode === 'source')    input = sourceInput.trim();
    if (mode === 'address')   input = addressInput.trim();
    if (mode === 'bytecode')  input = bytecodeInput.trim();

    if (!input) { setError('Please provide input to scan.'); return; }
    if (mode === 'address' && (input.length !== 42 || !input.startsWith('0x'))) {
      setError('Enter a valid Ethereum address (0x...)'); return;
    }

    setError('');
    setScanning(true);
    abortRef.current = false;

    // Animate steps
    const initial: ProgressStep[] = PROGRESS_STEPS.map(label => ({ label, status: 'pending' }));
    setSteps(initial);

    // Kick off API call in parallel with step animation
    const apiPromise = fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, input }),
    });

    // Animate progress steps
    for (let i = 0; i < PROGRESS_STEPS.length; i++) {
      if (abortRef.current) break;
      setSteps(prev => prev.map((s, idx) =>
        idx === i ? { ...s, status: 'running' } :
        idx < i   ? { ...s, status: 'done'    } : s
      ));
      await new Promise(r => setTimeout(r, 220 + Math.random() * 160));
    }

    try {
      const res = await apiPromise;
      if (!res.ok) throw new Error(await res.text());
      const result: ScanResult = await res.json();

      setSteps(prev => prev.map(s => ({ ...s, status: 'done' })));
      await new Promise(r => setTimeout(r, 200));

      onResult(result);
    } catch (e) {
      setError('Scan failed. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const tabCls = (t: ScanMode) =>
    `px-5 py-3.5 text-sm font-mono tracking-widest uppercase border-b-2 transition-colors cursor-pointer ${
      mode === t
        ? 'text-emerald-400 border-emerald-400'
        : 'text-[#8a9fb5] border-transparent hover:text-[#a0b3c5]'
    }`;

  return (
    <div className="rounded-xl border border-[#1c2535] overflow-hidden bg-[#0d1117]">
      {/* Tabs */}
      <div className="flex border-b border-[#1c2535] bg-[#080b10]">
        {(['source', 'address', 'bytecode'] as ScanMode[]).map(t => (
          <button key={t} className={tabCls(t)} onClick={() => { setMode(t); setError(''); }}>
            {t === 'source' ? '📄 Source' : t === 'address' ? '🔗 Address' : '⬡ Bytecode'}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Source tab */}
        {mode === 'source' && (
          <>
            <p className="text-sm font-mono text-[#8a9fb5] mb-3">
              Paste Solidity source — the engine detects EIP-2780, EIP-7904, EIP-8037, and EIP-8038 vulnerabilities.
            </p>
            <textarea
              value={sourceInput}
              onChange={e => setSourceInput(e.target.value)}
              rows={14}
              className="w-full bg-[#080b10] border border-[#1c2535] rounded-lg px-4 py-3 font-mono text-sm text-[#c9d6e8] leading-relaxed outline-none focus:border-emerald-500/40 resize-y transition-colors mb-3 placeholder-[#253345]"
              placeholder="// SPDX-License-Identifier: MIT&#10;pragma solidity ^0.8.0;&#10;&#10;contract MyContract { ... }"
              disabled={scanning}
            />
            {/* Quick examples */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <span className="text-xs font-mono tracking-widest uppercase text-[#6a8090]">Examples:</span>
              {EXAMPLES.map(ex => (
                <button
                  key={ex.key}
                  onClick={() => loadExample(ex.key)}
                  disabled={scanning}
                  className="text-xs font-mono px-3 py-1.5 rounded border border-[#1c2535] text-[#8a9fb5] hover:border-emerald-500/30 hover:text-emerald-400 transition-colors disabled:opacity-40"
                >
                  {ex.title}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Address tab */}
        {mode === 'address' && (
          <>
            <p className="text-sm font-mono text-[#8a9fb5] mb-3">
              Enter a verified Ethereum contract address. The API fetches source via Etherscan.
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={addressInput}
                onChange={e => setAddressInput(e.target.value)}
                placeholder="0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
                disabled={scanning}
                className="flex-1 bg-[#080b10] border border-[#1c2535] rounded-lg px-4 py-3 font-mono text-sm text-[#c9d6e8] outline-none focus:border-emerald-500/40 transition-colors placeholder-[#253345]"
              />
              <select className="bg-[#080b10] border border-[#1c2535] rounded-lg px-3 font-mono text-sm text-[#a0b3c5] outline-none">
                <option>Mainnet</option>
                <option>Sepolia</option>
                <option>Holesky</option>
              </select>
            </div>
            <div className="flex gap-2 flex-wrap mb-4">
              {['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'].map(addr => (
                <button key={addr} onClick={() => setAddressInput(addr)} disabled={scanning}
                  className="text-xs font-mono px-2.5 py-1.5 rounded border border-[#1c2535] text-[#8a9fb5] hover:border-emerald-500/30 hover:text-emerald-400 transition-colors">
                  {addr.slice(0, 10)}…
                </button>
              ))}
            </div>
            <p className="text-xs font-mono text-[#6a8090] mb-4">
              Demo: Live Etherscan fetching available in production build with API key.
            </p>
          </>
        )}

        {/* Bytecode tab */}
        {mode === 'bytecode' && (
          <>
            <p className="text-sm font-mono text-[#8a9fb5] mb-3">
              Paste raw EVM bytecode (hex). RepriceGuard disassembles and scans for gas constant patterns.
            </p>
            <textarea
              value={bytecodeInput}
              onChange={e => setBytecodeInput(e.target.value)}
              rows={8}
              disabled={scanning}
              className="w-full bg-[#080b10] border border-[#1c2535] rounded-lg px-4 py-3 font-mono text-sm text-[#c9d6e8] leading-relaxed outline-none focus:border-emerald-500/40 resize-y transition-colors mb-3 placeholder-[#253345]"
              placeholder="0x608060405234801561001057600080fd5b50..."
            />
            <div className="flex gap-2 flex-wrap mb-4">
              <button onClick={() => setBytecodeInput('0x608060405234801561001057600080fd5b50600436106100415760003560e01c80635208')} disabled={scanning}
                className="text-xs font-mono px-3 py-1.5 rounded border border-[#1c2535] text-[#8a9fb5] hover:border-emerald-500/30 hover:text-emerald-400 transition-colors">
                Hardcoded 0x5208 (21000)
              </button>
              <button onClick={() => setBytecodeInput('0x608060405234801561001057600080fd0900')} disabled={scanning}
                className="text-xs font-mono px-3 py-1.5 rounded border border-[#1c2535] text-[#8a9fb5] hover:border-emerald-500/30 hover:text-emerald-400 transition-colors">
                Transfer pattern
              </button>
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 rounded border border-red-500/30 bg-red-500/[0.06] px-4 py-3 text-sm font-mono text-red-400">
            {error}
          </div>
        )}

        {/* Progress */}
        {scanning && (
          <div className="mb-5">
            <div className="text-sm font-mono text-emerald-400 mb-3 tracking-wide">
              Scanning for Glamsterdam vulnerabilities…
            </div>
            {/* Animated scan bar */}
            <div className="h-[2px] bg-[#1c2535] rounded mb-4 overflow-hidden">
              <div className="h-full bg-emerald-400 rounded animate-[scanBar_1.6s_ease-in-out_infinite]" style={{width:'60%'}} />
            </div>
            <div className="space-y-1.5">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-3 text-sm font-mono">
                  <span className={
                    s.status === 'done'    ? 'text-emerald-400' :
                    s.status === 'running' ? 'text-amber-400 animate-pulse' :
                    'text-[#6a8090]'
                  }>
                    {s.status === 'done' ? '✓' : s.status === 'running' ? '◈' : '○'}
                  </span>
                  <span className={s.status === 'pending' ? 'text-[#6a8090]' : s.status === 'running' ? 'text-[#a0b3c5]' : 'text-[#8a9fb5]'}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scan button */}
        <button
          onClick={runScan}
          disabled={scanning}
          className="max-w-lg mx-auto flex items-center justify-center gap-2.5 py-3.5 rounded-lg font-mono text-sm font-semibold tracking-widest uppercase transition-all
            bg-emerald-400 text-[#080b10]
            hover:bg-emerald-300 hover:-translate-y-px hover:shadow-[0_6px_24px_rgba(0,229,160,0.25)]
            disabled:bg-[#1c2535] disabled:text-[#8a9fb5] disabled:translate-y-0 disabled:shadow-none disabled:cursor-not-allowed"
        >
          <span className="text-base">⬡</span>
          {scanning ? 'Scanning…' : 'Scan for Glamsterdam Vulnerabilities'}
        </button>
      </div>
    </div>
  );
}
