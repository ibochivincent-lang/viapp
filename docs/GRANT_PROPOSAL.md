# SCF / Drips Wave Grant Proposal: viapp

**Project:** viapp — The Modern Stock Gifting & Micro-Investing Protocol on Stellar  
**Applicant / Maintainer:** `ibochivincent-lang`  
**GitHub Repository:** [https://github.com/ibochivincent-lang/viapp](https://github.com/ibochivincent-lang/viapp)  
**Target Track:** SCF Tier-2 / Drips Wave Infrastructure & Product Track  

---

## 1. Executive Summary

**viapp** is a consumer onboarding and tokenized equity gifting protocol built natively on the Stellar network. It enables anyone to give a friend their first real share of stock (Nvidia, Apple, Tesla, S&P 500) through a single cryptographic link.

Recipients open the link on any phone or desktop, sign in with Google or email, and instantly own the share in a dedicated Stellar account—with **no seed phrases, no extensions, and no network fees to pay**.

Every share is:
1. **Purchased & Backed on Stellar:** Senders pay using native Stellar assets (`USDC` or `XLM`).
2. **Transitioning from Pegged to Direct Native Tokenization:** Initial Testnet features 1:1 pegged synthetic assets backed by institutional reserves (bStocks/xStocks); the active roadmap transitions directly to **natively tokenized and liquidated stocks issued directly on the Stellar blockchain** via SEP-0008 and SEP-0041, eliminating all cross-chain bridge risks.
3. **Direct On-Chain Liquidation:** Recipients can instantly liquidate (sell) their gifted shares directly on the Stellar Decentralized Exchange (SDEX) and Soroban AMMs for native Stellar USDC/XLM in sub-seconds.
4. **Sealed in Soroban:** Assets are locked into the Soroban `GiftVault` smart contract under a one-time cryptographic ed25519 key held solely in the gift link.
5. **Wrapped with x402:** The 5-cent gift wrap fee is paid via Stellar Agentic Payments (x402 / MPP).

---

## 2. Technical Architecture & Verified Testnet Evidence

### 2.1 Live Testnet Deployment & Execution
The protocol is already live and fully verified on Stellar Testnet:
* **Contract ID:** [`CDEDHFJ7POEWDFFDRV74ZIWK4CSDKGEN4B4IQXUZHMKGVMJIVFODEV5M`](https://stellar.expert/explorer/testnet/contract/CDEDHFJ7POEWDFFDRV74ZIWK4CSDKGEN4B4IQXUZHMKGVMJIVFODEV5M)
* **Deploy Tx:** [`8675102f...`](https://stellar.expert/explorer/testnet/tx/8675102f1054b1322c73c378ad28f42ad1ab094dfcea556c4266e62db48b4be5)
* **Init Tx:** [`2593bb74...`](https://stellar.expert/explorer/testnet/tx/2593bb74aefcb81c78b2a7d8518cffe28cbb71a05655dc314280f69fb9b72010)
* **Live Gift Creation Tx:** [`ad2a84c5...`](https://stellar.expert/explorer/testnet/tx/ad2a84c5d2dbda6d4c43c9abe7f45916c5e9a107aa3e3bdaf9f8b05d1164ae94) (locks XLM/stocks in GiftVault, registers Ed25519 claim proof, bumps TTL)
* **Live Gift Claim Tx:** [`21d69188...`](https://stellar.expert/explorer/testnet/tx/21d69188fc46dbee51e4c1f5c138f3dd0654ef8b0af8fd8ebe6b88bc3b28eaff) (verifies URL secret signature on-chain, gasless relayer settlement)

### 2.2 Soroban Smart Contract Architecture (`@viapp/contracts`)
The protocol core is implemented in Rust (`packages/contracts/stellar/src/lib.rs`):
- **`initialize(admin, relayer, initial_tokens)`**: Configures vault governance, authorized fee relayer, and initial listed equity addresses.
- **`create_gift(sender, token, amount, claim_pubkey, duration, sealed_note, key_proof)`**:
  - Enforces `sender.require_auth()`.
  - Cryptographically verifies `key_proof` via on-chain `env.crypto().ed25519_verify()` over a deterministic registration digest (`viapp:register:{network}:{contract_id}:{sender}`).
  - Pulls SAC tokens (`token::Client::transfer`) into contract escrow.
  - Emits storage TTL extension (`extend_ttl`) across instance and persistent ledger state to prevent rent-expiry.
- **`claim(gift_id, recipient, signature)`**:
  - Enforces authorized relayer execution to sponsor all recipient transaction fees.
  - Verifies claim signature on-chain (`env.crypto().ed25519_verify()`) over claim digest (`viapp:claim:{network}:{contract_id}:{gift_id}:{recipient}`).
  - Updates state to `Claimed` before dispatching tokens (Checks-Effects-Interactions pattern).
- **`refund(gift_id)`**:
  - Allows the original sender to reclaim their tokens if the recipient has not opened the gift before the chosen expiry window (7, 30, or 90 days).

### 2.2 Behind-The-Scenes 1:1 Pegged Reserve Engine (`@viapp/core`)
- Maps Stellar equity codes (`AAPL`, `NVDA`, `TSLA`, `MSFT`, `AMZN`, `GOOGL`, `META`, `SPY`, `QQQ`) to custodial contracts on Binance (`bStocks`) or OKX (`xStocks`).
- Computes cryptographic reserve attestation proofs ensuring liability invariants always match underlying custody balances.

---

## 3. Milestones & Itemized Budget (SCF Tier-2 Explicit Ask)

| Milestone | Deliverables | Timeline | Budget Bucket |
|---|---|---|---|
| **Milestone 1: Soroban Mainnet Deployment & Audit** | Deploy audited `GiftVault` to Stellar Mainnet, publish verified source code on StellarExpert, complete formal verification fuzzing tests. | Month 1 | $15,000 |
| **Milestone 2: Keyless Passkey Onboarding & Mobile SDK** | WebAuthn passkey support on Stellar, Freighter integration, native iOS/Android web component wrapper. | Month 2 | $20,000 |
| **Milestone 3: Native Stock Tokenization & On-Chain Liquidation** | Native Stellar stock tokenization (SEP-0008 / SEP-0041) replacing cross-chain pegged assets; direct on-chain liquidation engine with SDEX orderbooks and Soroban AMM liquidity pools; automated PoR (Proof of Reserves) telemetry and USDC dividend streaming. | Month 3 | $25,000 |
| **Total Ask** | **Full Protocol Delivery** | **3 Months** | **$60,000** |

---

## 4. Test Suite & Verification Matrix

All protocol operations are protected by automated tests across multiple languages:

| Test Suite | Framework | Count | Status |
|---|---|:---:|:---:|
| **Soroban Smart Contract Tests** | Rust `soroban-sdk` test harness | 5 | **PASS** |
| **Stellar Transaction Builders** | Vitest (`stellar-client.test.ts`) | 3 | **PASS** |
| **Stellar Stock Catalog & Quotations** | Vitest (`stocks-stellar.test.ts`) | 6 | **PASS** |
| **Soroban Gift Operations & Auth** | Vitest (`gift-stellar.test.ts`) | 8 | **PASS** |
| **Claim Signature & Verification** | Vitest (`claim-stellar.test.ts`) | 3 | **PASS** |
| **Unified Multi-Chain Quote Engine** | Vitest (`quote-unified.test.ts`) | 2 | **PASS** |
| **1:1 Peg Invariant & Bridge Engine** | Vitest (`bridge.test.ts`) | 4 | **PASS** |
| **Total Dedicated Stellar Tests** | | **31** | **100% PASS** |

---

## 5. Ecosystem Impact for Stellar
- **New Onboarding Primitive:** Onboards non-crypto users to Stellar with real, familiar financial assets (equities).
- **Soroban Showcase:** Uses advanced Soroban capabilities: ed25519 host verification, SAC interoperability, and persistent TTL bump management.
- **x402 Agentic Integration:** Demonstrates real-world machine-payable micro-transactions on Stellar.

