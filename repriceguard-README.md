# RepriceGuard ⬡

> **Glamsterdam Upgrade Readiness Tool** — Scan Ethereum contracts for gas repricing vulnerabilities before they break on mainnet.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Glamsterdam](https://img.shields.io/badge/Glamsterdam-Ready-00e5a0)](https://esp.ethereum.foundation/applicants/wishlist/glamsterdam-round)
[![EIP-2780](https://img.shields.io/badge/EIP--2780-CFI-f0a500)](https://eips.ethereum.org/EIPS/eip-2780)

## What is RepriceGuard?

Glamsterdam changes the cost of nearly every on-chain operation. **EIP-2780** drops `TX_BASE_COST` from 21,000 to 4,500 — but sending ETH to a *new* account now costs **31,756** (a 51% increase). **EIP-8037** raises contract deployment costs by ~10×. **EIP-7904** reprices 18+ opcodes.

RepriceGuard detects the hardcoded gas patterns that will break — *before* mainnet activation.

## Live Demo

**→ [repriceguard.xyz](https://repriceguard.xyz)** *(link will be live)*

Paste any Solidity contract and get an instant vulnerability report.

## The Glamsterdam Gas Bundle

| EIP | Change | Direction | Status |
|-----|--------|-----------|--------|
| EIP-2780 | TX_BASE_COST: 21,000 → 4,500 | ↓ base, ↑ new accounts | CFI |
| EIP-7904 | 18+ opcodes repriced (benchmark-driven) | Mixed | CFI |
| EIP-8037 | Contract deployment: ~10× state_gas | ↑↑ | CFI |
| EIP-8038 | Cold SLOAD/account reads | ↑ | CFI |
| EIP-7708 | ETH transfers emit LOG3 (+1,756 gas) | ↑ | CFI |

## Gas Cost Changes (Key Numbers)

```
ETH transfer to EXISTING account:  21,000 → 7,756   (-63%)
ETH transfer to NEW account:        21,000 → 31,756  (+51%) ⚠️ CRITICAL
CALL with value:                     9,000 → 3,756   (-58%)
TX intrinsic base:                  21,000 → 4,500   (-79%)
Contract deployment:                ~32k  → ~320k    (~10x) ⚠️ CRITICAL
Cold SLOAD:                          2,100 → 3,000   (+43%)
```

## Vulnerability Patterns Detected

| Pattern | Severity | EIP |
|---------|----------|-----|
| Hardcoded `21000` gas in calls | CRITICAL | EIP-2780 |
| Factory/CREATE with fixed gas budget | CRITICAL | EIP-8037 |
| `.transfer()` / `.send()` usage | HIGH | EIP-2780 + EIP-7708 |
| Hardcoded `2300` gas stipend | HIGH | EIP-2780 |
| `gasleft()` against gas constants | MEDIUM | EIP-8038 |
| Relayer base gas = 21,000 | MEDIUM | EIP-2780 |

## Usage

### Web UI
Visit [repriceguard.xyz](https://repriceguard.xyz) and paste your contract.

### Self-hosted
```bash
git clone https://github.com/your-org/repriceguard
cd repriceguard
# No build step — open index.html in any browser
open index.html
```

### CLI (coming in v0.2)
```bash
npm install -g repriceguard
repriceguard scan ./contracts --network glamsterdam-testnet
```

### Foundry Plugin (coming in v0.3)
```bash
forge install repriceguard
# In foundry.toml:
# [profile.glamsterdam]
# evm_version = "glamsterdam"
```

## Architecture

```
Input (Solidity / Address / Bytecode)
    ↓
Static Pattern Scanner
    ↓ regex + AST analysis for dangerous gas constants
EIP Rule Engine (EIP-2780 / 7904 / 8037 / 8038)
    ↓ maps each pattern to specific EIP gas change
Severity Scorer + Gas Delta Calculator
    ↓
Output: Web UI / JSON Report / CI exit code
```

**Core engine:** Pure JavaScript (browser + Node.js)  
**Production v0.2:** Rust (`revm`-based) EVM simulation layer  
**Web UI:** Vanilla HTML/CSS/JS — zero dependencies, self-contained  

## Roadmap

- [x] **v0.1** — Static analysis engine + web UI (current)
- [ ] **v0.2** — Rust/revm simulation engine, CLI tool
- [ ] **v0.3** — Foundry plugin (`forge repricing`)
- [ ] **v0.4** — Hardhat plugin + public REST API
- [ ] **v0.5** — Glamsterdam testnet validation + final report

## Grant

This project is applying for the [Ethereum Foundation Glamsterdam Grants Round](https://esp.ethereum.foundation/applicants/wishlist/glamsterdam-round).

**Category:** Impact Analysis + Developer Tooling  
**Budget:** $24,000 USD  
**Timeline:** 4 months  
**License:** MIT  

## License

MIT — free to use, fork, and self-host.

---

*Built for the Ethereum ecosystem. Not affiliated with the Ethereum Foundation.*
