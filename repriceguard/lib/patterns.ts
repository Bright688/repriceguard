import type { Finding, VulnHit, Severity } from '@/types';

interface PatternDef {
  id: string;
  severity: Severity;
  title: string;
  eips: string[];
  description: string;
  detect: (lines: string[]) => VulnHit[];
  gasImpact: { old: number; new: number; direction: 'up' | 'down' | 'neutral'; note: string };
  remediation: string;
  codeExample: { bad: string; good: string };
  gasTableOps: string[];
}

export const VULN_PATTERNS: PatternDef[] = [
  {
    id: 'hardcoded-21000',
    severity: 'critical',
    title: 'Hardcoded 21,000 Gas Constant',
    eips: ['EIP-2780'],
    description:
      'The value <strong>21,000</strong> is hardcoded as a gas limit for ETH sends or calls. ' +
      'Under EIP-2780, TX_BASE_COST drops to 4,500 and a simple ETH transfer to an existing account costs 7,756. ' +
      '<strong>Critically, sending to a new (non-existent) account now costs 31,756</strong> — 51% MORE than before. ' +
      'Any call forwarding exactly 21,000 gas to a new account will revert with out-of-gas.',
    detect(lines) {
      const hits: VulnHit[] = [];
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        // Skip pure comments
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        // Match 21000 or 0x5208 in non-comment part of line
        const commentIdx = line.indexOf('//');
        const codePart = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
        if (/21000|0x5208/i.test(codePart) && /gas|call|transfer|send/i.test(codePart)) {
          hits.push({ line: i + 1, text: trimmed.slice(0, 90) });
        }
      });
      return hits;
    },
    gasImpact: { old: 21_000, new: 31_756, direction: 'up', note: 'ETH send to new account — goes UP 51%' },
    remediation:
      'Replace hardcoded gas values with dynamic estimation. Use <code>gasleft()</code> or remove explicit gas ' +
      'forwarding entirely. If a minimum must be set, use at least <strong>35,000</strong> to safely cover ' +
      'the new-account case (31,756) with a buffer. Update after Glamsterdam testnet confirmation.',
    codeExample: {
      bad: `// ❌ BREAKS POST-GLAMSTERDAM (EIP-2780)
(bool ok,) = payable(recipient).call{gas: 21000, value: amount}("");
// Reverts with OOG if recipient is a new/non-existent account
// New cost: 31,756 gas — your 21,000 cap is insufficient`,
      good: `// ✅ SAFE POST-GLAMSTERDAM
// Option A: Let EVM allocate gas (safest — 63/64 rule applies)
(bool ok,) = payable(recipient).call{value: amount}("");
require(ok, "Transfer failed");

// Option B: Generous explicit minimum (covers new-account case)
(bool ok,) = payable(recipient).call{gas: 35_000, value: amount}("");
require(ok, "Transfer failed");`,
    },
    gasTableOps: [
      'ETH transfer → existing EOA',
      'ETH transfer → NEW account',
      'TX intrinsic base cost',
    ],
  },

  {
    id: 'dot-transfer-send',
    severity: 'high',
    title: '.transfer() / .send() — 2,300 Gas Stipend Risk',
    eips: ['EIP-2780', 'EIP-7708'],
    description:
      '<strong>.transfer()</strong> and <strong>.send()</strong> forward exactly 2,300 gas to the recipient. ' +
      'EIP-2780 changes CALL_VALUE_COST from 9,000 → 3,756. EIP-7708 adds TRANSFER_LOG_COST = 1,756 to every ETH transfer. ' +
      'The 2,300 stipend remains, but the gas accounting in the surrounding call frame shifts. ' +
      'Contracts with <code>receive()</code> logic that emits events may no longer fit within 2,300 gas.',
    detect(lines) {
      const hits: VulnHit[] = [];
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (/\.transfer\s*\(|\.send\s*\(/.test(line)) {
          hits.push({ line: i + 1, text: trimmed.slice(0, 90) });
        }
      });
      return hits;
    },
    gasImpact: { old: 9_000, new: 3_756, direction: 'down', note: 'CALL_VALUE_COST; callee gas accounting shifts' },
    remediation:
      'Replace <code>.transfer()</code> and <code>.send()</code> with low-level ' +
      '<code>.call{value: amount}("")</code> plus explicit error handling and a reentrancy guard. ' +
      'This has been OpenZeppelin\'s recommendation since 2019 and remains correct post-Glamsterdam.',
    codeExample: {
      bad: `// ❌ RISKY POST-GLAMSTERDAM
payable(recipient).transfer(amount); // Hard 2300 gas cap
bool sent = payable(recipient).send(amount); // Same issue`,
      good: `// ✅ SAFE POST-GLAMSTERDAM
// Use nonReentrant modifier or checks-effects-interactions
(bool success,) = payable(recipient).call{value: amount}("");
require(success, "ETH transfer failed");`,
    },
    gasTableOps: [
      'CALL with value (existing)',
      'Transfer log (EIP-7708)',
    ],
  },

  {
    id: 'factory-create',
    severity: 'critical',
    title: 'Factory / CREATE with Fixed Gas Budget',
    eips: ['EIP-8037'],
    description:
      'EIP-8037 introduces separate <strong>state_gas</strong> metering. ' +
      '<strong>Contract deployments via CREATE and CREATE2 cost approximately 10× more</strong> in state_gas post-Glamsterdam. ' +
      'Factory contracts that forward a fixed or capped gas budget to child contract deployment ' +
      'will fail with out-of-gas. This affects EIP-1167 clone factories, CREATE2 deployers, and ' +
      'any contract using assembly-level <code>create</code> with gas assumptions.',
    detect(lines) {
      const hits: VulnHit[] = [];
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (/create\s*\(|create2\s*\(|Clones\.|cloneDeterministic|deployMinimalProxy|new\s+\w+\{.*gas/i.test(line)) {
          hits.push({ line: i + 1, text: trimmed.slice(0, 90) });
        }
      });
      return hits;
    },
    gasImpact: { old: 32_000, new: 320_000, direction: 'up', note: 'EIP-8037: ~10× state_gas for deployments' },
    remediation:
      'Remove hardcoded gas caps from CREATE/CREATE2 calls. Let the EVM allocate gas via the 63/64 rule. ' +
      'If a cap is required, compute it dynamically using post-EIP-8037 constants. ' +
      'Update all OpenZeppelin <code>Clones</code> library calls once a Glamsterdam-compatible version is released.',
    codeExample: {
      bad: `// ❌ BREAKS POST-GLAMSTERDAM (EIP-8037)
function deploy(bytes memory code) external {
    address child;
    assembly {
        child := create(0, add(code, 32), mload(code))
        // state_gas consumed is now ~10x — caller gas budget insufficient
    }
    require(child != address(0), "Deploy failed");
}`,
      good: `// ✅ SAFE — no fixed gas cap; let EVM manage state_gas
function deploy(bytes memory code) external {
    address child;
    assembly {
        // No explicit gas cap — 63/64 rule allocates correctly
        child := create(0, add(code, 32), mload(code))
    }
    require(child != address(0), "Deploy failed — check state_gas");
}`,
    },
    gasTableOps: ['CONTRACT DEPLOY (approx)'],
  },

  {
    id: 'hardcoded-2300',
    severity: 'high',
    title: 'Hardcoded 2,300 Gas Stipend',
    eips: ['EIP-2780', 'EIP-7708'],
    description:
      'Forwarding exactly <strong>2,300 gas</strong> was historically safe for a simple ETH send. ' +
      'EIP-7708 adds TRANSFER_LOG_COST = 1,756 gas to every ETH transfer, and EIP-2780 changes the surrounding ' +
      'call frame accounting. Contracts that explicitly forward 2,300 gas and expect the callee ' +
      'to emit an event or update a variable in <code>receive()</code> may fail.',
    detect(lines) {
      const hits: VulnHit[] = [];
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (/2300/.test(line) && /gas|stipend|call|transfer/i.test(line)) {
          hits.push({ line: i + 1, text: trimmed.slice(0, 90) });
        }
      });
      return hits;
    },
    gasImpact: { old: 2_300, new: 2_300, direction: 'neutral', note: 'Stipend unchanged; EIP-7708 log adds pressure' },
    remediation:
      'Audit <code>receive()</code> functions in contracts receiving ETH via 2,300-gas forwards. ' +
      'Ensure they perform only minimal work. Prefer removing explicit gas stipends entirely and ' +
      'using <code>.call{value: amount}("")</code> with a reentrancy guard instead.',
    codeExample: {
      bad: `// ❌ RISKY — 2300 may be insufficient post EIP-7708
(bool ok,) = target.call{gas: 2300, value: amt}("");
// If target's receive() emits an event, EIP-7708 log
// eats 1,756 of the 2,300 — only 544 left for logic`,
      good: `// ✅ SAFE — no arbitrary gas cap
(bool ok,) = payable(target).call{value: amt}("");
require(ok, "Call failed");`,
    },
    gasTableOps: ['Transfer log (EIP-7708)', 'CALL with value (existing)'],
  },

  {
    id: 'cold-sload-assumption',
    severity: 'medium',
    title: 'Cold SLOAD / Gas Assertion Against Constants',
    eips: ['EIP-8038'],
    description:
      'EIP-8038 raises cold storage read costs. Code that asserts remaining gas against ' +
      'the current cold SLOAD cost (2,100) or uses it as a gate will break. ' +
      'This includes Forge test files with <code>gasleft()</code> assertions and ' +
      'production contracts that branch on gas remaining after storage reads.',
    detect(lines) {
      const hits: VulnHit[] = [];
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        const hasColdRef = /2100|COLD_SLOAD|coldSload/i.test(line);
        const hasGasLeft = /gasleft\s*\(\)/.test(line) && /assert|require|if\s*\(/.test(line);
        if (hasColdRef || hasGasLeft) {
          hits.push({ line: i + 1, text: trimmed.slice(0, 90) });
        }
      });
      return hits;
    },
    gasImpact: { old: 2_100, new: 3_000, direction: 'up', note: 'EIP-8038: cold SLOAD +43%' },
    remediation:
      'Update hardcoded cold SLOAD constants from 2,100 to 3,000. ' +
      'Run <code>forge snapshot --update</code> against a Glamsterdam-forked devnet to regenerate gas snapshots. ' +
      'In production code, avoid branching on <code>gasleft()</code> after storage reads.',
    codeExample: {
      bad: `// ❌ BREAKS on Glamsterdam-forked devnet (EIP-8038)
uint before = gasleft();
someContract.readStorage();
// cold SLOAD now costs 3,000 not 2,100
assertEq(before - gasleft(), 2100); // fails`,
      good: `// ✅ Test behavior, not gas cost
// OR use updated constant
uint COLD_SLOAD = 3000; // EIP-8038
assertLe(before - gasleft(), COLD_SLOAD + 100);`,
    },
    gasTableOps: ['Cold SLOAD'],
  },

  {
    id: 'relayer-base-gas',
    severity: 'medium',
    title: 'Relayer / Meta-Tx Base Gas Estimation',
    eips: ['EIP-2780'],
    description:
      'Relayer contracts and meta-transaction systems that compute gas limits starting from ' +
      'TX_BASE_COST = 21,000 will produce incorrect estimates post-EIP-2780. ' +
      'The new base is 4,500 for contract calls and 7,756 for ETH transfers. ' +
      'Gas estimates that add execution gas on top of 21,000 will systematically over-estimate, ' +
      'potentially making transactions unnecessarily expensive or breaking on-chain gas budgets.',
    detect(lines) {
      const hits: VulnHit[] = [];
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (
          /BASE_GAS|BASE_FEE|INTRINSIC|intrinsic/i.test(line) && /21000|0x5208/i.test(line)
        ) {
          hits.push({ line: i + 1, text: trimmed.slice(0, 90) });
        }
        if (/uint.*=.*21000/.test(line) && /gas/i.test(line)) {
          hits.push({ line: i + 1, text: trimmed.slice(0, 90) });
        }
      });
      return hits;
    },
    gasImpact: { old: 21_000, new: 4_500, direction: 'down', note: 'TX_BASE_COST: 21,000 → 4,500 (contract calls)' },
    remediation:
      'Update relayer gas estimation to use new constants: TX_BASE_COST = 4,500 (contract calls), ' +
      'ETH_TRANSFER = 7,756 (existing EOA) or 31,756 (new account). ' +
      'These values will be exported by post-Glamsterdam versions of viem, ethers.js, and web3.py.',
    codeExample: {
      bad: `// ❌ OUTDATED AFTER EIP-2780
uint256 constant BASE_GAS = 21000;
uint256 constant OVERHEAD  = 5000;
uint256 gasLimit = BASE_GAS + executionEstimate + OVERHEAD;`,
      good: `// ✅ POST-GLAMSTERDAM (EIP-2780)
uint256 constant TX_BASE_COST       = 4_500;  // contract calls
uint256 constant ETH_TRANSFER_COST  = 7_756;  // to existing EOA
uint256 constant ETH_NEW_ACCT_COST  = 31_756; // to new account
uint256 gasLimit = TX_BASE_COST + executionEstimate + OVERHEAD;`,
    },
    gasTableOps: ['TX intrinsic base cost', 'ERC-20 transfer (typical)'],
  },

  {
    id: 'keccak-heavy',
    severity: 'info',
    title: 'KECCAK256-Heavy Contract (Opcode Repricing)',
    eips: ['EIP-7904'],
    description:
      'EIP-7904 reprices KECCAK256 upward (30 → 50 base, 6 → 10 per word) because hash operations ' +
      'benchmark below the 60 MGas/s target on client measurements. Contracts that compute ' +
      'many hashes — Merkle proof verifiers, commit-reveal schemes, EIP-712 signature validators — ' +
      'will cost more post-Glamsterdam. No code changes are required, but gas estimates should be updated.',
    detect(lines) {
      const hits: VulnHit[] = [];
      let keccakCount = 0;
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (/keccak256\s*\(/i.test(line)) {
          keccakCount++;
          if (keccakCount <= 3) hits.push({ line: i + 1, text: trimmed.slice(0, 90) });
        }
      });
      return hits;
    },
    gasImpact: { old: 30, new: 50, direction: 'up', note: 'EIP-7904: KECCAK256 base cost +67%' },
    remediation:
      'No code changes required — this is an informational finding. ' +
      'Update any off-chain gas estimates for hash-heavy operations. ' +
      'If gas limits are tight in keccak-heavy loops, consider batching or caching hashes.',
    codeExample: {
      bad: `// ⚠️ Informational — higher gas post EIP-7904
bytes32 leaf = keccak256(abi.encodePacked(addr, amount));
bytes32 node = keccak256(abi.encodePacked(leaf, proof[i]));
// Each keccak256: was 30 base + 6/word → now 50 base + 10/word`,
      good: `// ✅ No code change needed — update gas estimates
// Old estimate: ~42 gas per 32-byte hash
// New estimate: ~70 gas per 32-byte hash (EIP-7904)
// Cache intermediate hashes where possible in loops`,
    },
    gasTableOps: ['KECCAK256 (30 bytes)'],
  },
];

/**
 * Run all patterns against source code.
 * Returns findings sorted by severity.
 */
export function detectVulnerabilities(source: string): Omit<Finding, never>[] {
  const lines = source.split('\n');
  const findings: Omit<Finding, never>[] = [];
  const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, info: 3 };

  for (const pattern of VULN_PATTERNS) {
    const hits = pattern.detect(lines);
    if (hits.length > 0) {
      findings.push({
        id: pattern.id,
        severity: pattern.severity,
        title: pattern.title,
        eips: pattern.eips,
        description: pattern.description,
        hits,
        gasImpact: pattern.gasImpact,
        remediation: pattern.remediation,
        codeExample: pattern.codeExample,
      });
    }
  }

  return findings.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
}
