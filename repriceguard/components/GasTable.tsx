'use client';
import type { GasTableRow } from '@/types';

function pct(oldV: number, newV: number) {
  if (oldV === 0) return '+∞';
  const p = Math.round(((newV - oldV) / oldV) * 100);
  return (p > 0 ? '+' : '') + p + '%';
}

export function GasTable({ rows }: { rows: GasTableRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-mono border-collapse">
        <thead>
          <tr className="border-b border-[#1c2535]">
            {['Operation', 'Pre-Glamsterdam', 'Post-Glamsterdam', 'Change', 'EIP'].map(h => (
              <th key={h} className="text-left py-3 px-3 text-sm tracking-widest uppercase text-[#8a9fb5] font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const dir = row.new > row.old ? 'up' : row.new < row.old ? 'down' : 'neutral';
            const p = pct(row.old, row.new);
            return (
              <tr
                key={row.op}
                className={`border-b border-[#1c2535]/50 last:border-0 transition-colors hover:bg-white/[0.02] ${row.critical ? 'bg-red-500/[0.04]' : ''}`}
              >
                <td className="py-2.5 px-3 text-[#c9d6e8] font-medium">
                  {row.critical && <span className="text-red-400 mr-1.5">⚠</span>}
                  {row.op}
                </td>
                <td className="py-2.5 px-3 text-[#a0b3c5] tabular-nums">{row.old.toLocaleString()}</td>
                <td className={`py-2.5 px-3 font-semibold tabular-nums ${dir === 'up' ? 'text-red-400' : dir === 'down' ? 'text-emerald-400' : 'text-[#a0b3c5]'}`}>
                  {row.new.toLocaleString()}
                </td>
                <td className={`py-2.5 px-3 tabular-nums ${dir === 'up' ? 'text-red-400' : dir === 'down' ? 'text-emerald-400' : 'text-[#a0b3c5]'}`}>
                  {p}
                </td>
                <td className="py-2.5 px-3">
                  <span className="text-sm tracking-wide text-[#8a9fb5] bg-[#111823] border border-[#1c2535] rounded px-2 py-1">
                    {row.eip}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
