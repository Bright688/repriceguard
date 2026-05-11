export type Severity = 'critical' | 'high' | 'medium' | 'info';
export type ScanMode = 'source' | 'address' | 'bytecode';
export type GasDelta = 'up' | 'down' | 'neutral';

export interface VulnHit {
  line: number;
  text: string;
}

export interface GasImpact {
  old: number;
  new: number;
  direction: GasDelta;
  note: string;
}

export interface CodeExample {
  bad: string;
  good: string;
}

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  eips: string[];
  description: string;
  hits: VulnHit[];
  gasImpact: GasImpact;
  remediation: string;
  codeExample: CodeExample;
}

export interface GasTableRow {
  op: string;
  old: number;
  new: number;
  eip: string;
  critical: boolean;
}

export interface ScanCounts {
  critical: number;
  high: number;
  medium: number;
  info: number;
}

export interface ScanResult {
  label: string;
  findings: Finding[];
  gasTable: GasTableRow[];
  counts: ScanCounts;
  scannedAt: string;
  linesAnalyzed: number;
}

export interface ScanRequest {
  mode: ScanMode;
  input: string;
  network?: string;
}

export interface ProgressStep {
  label: string;
  status: 'pending' | 'running' | 'done';
}
