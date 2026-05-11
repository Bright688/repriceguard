/**
 * Glamsterdam Gas Rules Database
 * All values sourced from actual EIP specifications:
 * EIP-2780, EIP-7904, EIP-8037, EIP-8038, EIP-7708
 */

export const GAS_RULES = {
  // ── EIP-2780: Reduce Intrinsic Transaction Gas ──────────────────────────
  TX_BASE_COST_OLD:           21_000,
  TX_BASE_COST_NEW:            4_500,  // ECRECOVER(3000) + STATE_UPDATE(1000) + COLD_NOCODE(500)
  ETH_TRANSFER_EXISTING_OLD:  21_000,
  ETH_TRANSFER_EXISTING_NEW:   7_756,  // 4500 + COLD_NOCODE(500) + STATE_UPDATE(1000) + LOG_COST(1756)
  ETH_TRANSFER_NEW_ACCT_OLD:  21_000,
  ETH_TRANSFER_NEW_ACCT_NEW:  31_756,  // 4500 + 500 + GAS_NEW_ACCOUNT(25000) + LOG_COST(1756) ⚠️ GOES UP
  CALL_VALUE_COST_OLD:         9_000,
  CALL_VALUE_COST_NEW:         3_756,  // 2*STATE_UPDATE(2000) + TRANSFER_LOG_COST(1756)
  TRANSFER_LOG_COST_NEW:       1_756,  // EIP-7708: LOG3 = 375 + 3×375 + 32×8
  GAS_NEW_ACCOUNT:            25_000,  // New surcharge for value-tx to nonexistent account
  COLD_ACCOUNT_NOCODE_OLD:     2_600,
  COLD_ACCOUNT_NOCODE_NEW:       500,  // Non-code accounts cheaper to warm
  STATE_UPDATE:                1_000,  // One account-leaf write

  // ── EIP-7904: General Opcode Repricing (benchmark-driven) ───────────────
  // Targets operations performing below 60 MGas/s on client benchmarks (Jan 2026)
  KECCAK256_PER_WORD_OLD: 6,   KECCAK256_PER_WORD_NEW: 10,
  KECCAK256_BASE_OLD:    30,   KECCAK256_BASE_NEW:     50,
  BALANCE_COLD_OLD:     400,   BALANCE_COLD_NEW:      700,
  // ~18 opcodes total repriced — we cover the most impactful ones

  // ── EIP-8037: State Creation Gas Cost Increase ──────────────────────────
  // Introduces separate state_gas dimension; ~10× for deployments, ~8.5× new accounts
  CREATE_STATE_MULTIPLIER:   10,   // approximate state_gas factor for CREATE/CREATE2
  SSTORE_NEW_SLOT_FACTOR:     3,   // new storage slots significantly more expensive

  // ── EIP-8038: State-Access Gas Cost Increase ────────────────────────────
  COLD_SLOAD_OLD:   2_100,
  COLD_SLOAD_NEW:   3_000,   // +43% — cold storage reads costlier

  // ── Derived real-world deltas (from EIP-2780 reference table) ───────────
  ERC20_TRANSFER_OLD:   63_200,  ERC20_TRANSFER_NEW:   48_200,
  ERC20_SOLADY_OLD:     33_400,  ERC20_SOLADY_NEW:     18_400,
  UNISWAP_V3_SWAP_OLD: 184_500,  UNISWAP_V3_SWAP_NEW: 169_500,
  UNISWAP_ADD_LIQ_OLD: 216_900,  UNISWAP_ADD_LIQ_NEW: 201_900,
} as const;

export const GAS_DELTA_TABLE = [
  { op: 'ETH transfer → existing EOA',  old: 21_000, new:  7_756, eip: 'EIP-2780', critical: false },
  { op: 'ETH transfer → NEW account',   old: 21_000, new: 31_756, eip: 'EIP-2780', critical: true  },
  { op: 'TX intrinsic base cost',        old: 21_000, new:  4_500, eip: 'EIP-2780', critical: false },
  { op: 'CALL with value (existing)',    old:  9_000, new:  3_756, eip: 'EIP-2780', critical: false },
  { op: 'Transfer log (EIP-7708)',       old:      0, new:  1_756, eip: 'EIP-7708', critical: false },
  { op: 'ERC-20 transfer (typical)',     old: 63_200, new: 48_200, eip: 'EIP-2780', critical: false },
  { op: 'ERC-20 transfer (Solady)',      old: 33_400, new: 18_400, eip: 'EIP-2780', critical: false },
  { op: 'Uniswap v3 swap',              old: 184_500, new: 169_500, eip: 'EIP-7904', critical: false },
  { op: 'CONTRACT DEPLOY (approx)',      old: 32_000, new: 320_000, eip: 'EIP-8037', critical: true  },
  { op: 'Cold SLOAD',                    old:  2_100, new:   3_000, eip: 'EIP-8038', critical: false },
  { op: 'KECCAK256 (30 bytes)',          old:     30, new:      50, eip: 'EIP-7904', critical: false },
  { op: 'Cold account read (no code)',   old:  2_600, new:     500, eip: 'EIP-2780', critical: false },
];
