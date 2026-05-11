import { detectVulnerabilities, VULN_PATTERNS } from './patterns';
import { GAS_DELTA_TABLE } from './gasRules';
import type { ScanResult, ScanCounts, GasTableRow } from '@/types';

export function analyzeSource(source: string, label: string): ScanResult {
  const lines = source.split('\n');
  const findings = detectVulnerabilities(source);

  // Collect relevant gas table rows based on what was found
  const relevantOps = new Set<string>();
  for (const finding of findings) {
    const pattern = VULN_PATTERNS.find(p => p.id === finding.id);
    if (pattern) {
      pattern.gasTableOps.forEach(op => relevantOps.add(op));
    }
  }
  // Always include baseline rows
  if (relevantOps.size === 0) {
    relevantOps.add('ETH transfer → existing EOA');
    relevantOps.add('TX intrinsic base cost');
    relevantOps.add('ERC-20 transfer (typical)');
  }
  // Always show the critical "new account" row if ETH-related vulns found
  if (relevantOps.has('ETH transfer → existing EOA')) {
    relevantOps.add('ETH transfer → NEW account');
  }

  const gasTable: GasTableRow[] = GAS_DELTA_TABLE.filter(r => relevantOps.has(r.op));

  const counts: ScanCounts = {
    critical: findings.filter(f => f.severity === 'critical').length,
    high:     findings.filter(f => f.severity === 'high').length,
    medium:   findings.filter(f => f.severity === 'medium').length,
    info:     findings.filter(f => f.severity === 'info').length,
  };

  return {
    label,
    findings,
    gasTable,
    counts,
    scannedAt: new Date().toISOString(),
    linesAnalyzed: lines.filter(l => l.trim()).length,
  };
}
