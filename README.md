<p align="center"><img src="packages/web/public/v-mark.svg" alt="ViApp" width="64"></p>

# ViApp: Tokenized Equities & Gift Vault on Stellar

[![CI - viapp Protocol](https://github.com/ibochivincent-lang/viapp/actions/workflows/ci.yml/badge.svg)](https://github.com/ibochivincent-lang/viapp/actions/workflows/ci.yml)
[![Stellar Network](https://img.shields.io/badge/Stellar-Testnet-blue.svg)](https://stellar.expert/explorer/testnet/contract/CDEDHFJ7POEWDFFDRV74ZIWK4CSDKGEN4B4IQXUZHMKGVMJIVFODEV5M)
[![Soroban](https://img.shields.io/badge/Soroban-Rust%20Contract-purple.svg)](packages/contracts/stellar)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)

Send someone their first share of Apple, NVIDIA, or Tesla as a shareable link. The recipient signs in with Google, email, or a biometric Stellar passkey and owns real tokenized equity on Stellar with no pre-funded crypto, no browser extensions, and zero gas fees.

Everything on ViApp's user surface runs natively on **Stellar**: users pay in **XLM or USDC on Stellar**, gifts are locked in a **Soroban Smart Contract**, and tokenized equities are held, gifted, and transferred directly on the Stellar network. While current Testnet deployment features 1:1 pegged assets backed by institutional reserves, **ViApp's active roadmap transitions directly to natively tokenized and directly liquidated stocks issued on the Stellar blockchain rather than remaining pegged**.

[Live Testnet Contract](https://stellar.expert/explorer/testnet/contract/CDEDHFJ7POEWDFFDRV74ZIWK4CSDKGEN4B4IQXUZHMKGVMJIVFODEV5M) · [Architecture Specification](docs/ARCHITECTURE.md) · [Technical & Product Roadmap](docs/ROADMAP.md) · [SCF Grant Proposal](docs/GRANT_PROPOSAL.md) · [CI Pipeline](.github/workflows/ci.yml)

---

## User Interface & Live Application Flow

<p align="center">
  <img src="docs/assets/screenshots/localhost-landing.png" alt="ViApp Hero Landing & Certificate Seal" width="85%">
</p>

<p align="center">
  <em>The ViApp Landing Experience: Dark-mode certificate seal, interactive envelope preview, and live tokenized stock status on Stellar.</em>
</p>

<br>

<p align="center">
  <img src="docs/assets/screenshots/localhost-send.png" alt="ViApp Send & Gift Flow" width="48%">
  &nbsp;
  <img src="docs/assets/screenshots/localhost-send-stocks.png" alt="ViApp Interactive Stock Picker" width="48%">
</p>

<p align="center">
  <em>Left: Streamlined send interface with preset amounts, 30-day expiration, and AES-GCM encrypted notes. Right: Interactive modal selecting from leading global equities.</em>
</p>

<br>

<p align="center">
  <img src="docs/assets/screenshots/localhost-home-stocks.png" alt="ViApp Live Equities Directory" width="85%">
</p>

<p align="center">
  <em>Real-time tokenized stocks directory displaying live market status, pricing, and 1:1 backing proof.</em>
</p>

---

## Live on Stellar Testnet

The core ViApp smart contract `viapp-gift-vault` is deployed, initialized, and verified on the Stellar Testnet with live on-chain gift creation and claim transactions:

| Resource | Value | Explorer / Verification Link |
|---|---|---|
| **Contract ID** | `CDEDHFJ7POEWDFFDRV74ZIWK4CSDKGEN4B4IQXUZHMKGVMJIVFODEV5M` | [Stellar Expert Explorer](https://stellar.expert/explorer/testnet/contract/CDEDHFJ7POEWDFFDRV74ZIWK4CSDKGEN4B4IQXUZHMKGVMJIVFODEV5M) |
| **WASM Hash** | `89cfaedb8f5c3933e47dbb6f5eed3f182a31ed972738f60ef61efbd6b2f85266` | [Stellar Lab Contract](https://lab.stellar.org/r/testnet/contract/CDEDHFJ7POEWDFFDRV74ZIWK4CSDKGEN4B4IQXUZHMKGVMJIVFODEV5M) |
| **Deploy Transaction** | `8675102f...4be5` | [View Deploy Tx](https://stellar.expert/explorer/testnet/tx/8675102f1054b1322c73c378ad28f42ad1ab094dfcea556c4266e62db48b4be5) |
| **Init Transaction** | `2593bb74...2010` | [View Init Tx](https://stellar.expert/explorer/testnet/tx/2593bb74aefcb81c78b2a7d8518cffe28cbb71a05655dc314280f69fb9b72010) |
| **Initial Listed Token** | Native XLM SAC (`CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`) | [View Asset Contract](https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC) |
| **Live Gift Creation Tx** | `ad2a84c5...ae94` | [View Create Gift Tx](https://stellar.expert/explorer/testnet/tx/ad2a84c5d2dbda6d4c43c9abe7f45916c5e9a107aa3e3bdaf9f8b05d1164ae94) |
| **Live Gift Claim Tx** | `21d69188...eaff` | [View Claim Gift Tx](https://stellar.expert/explorer/testnet/tx/21d69188fc46dbee51e4c1f5c138f3dd0654ef8b0af8fd8ebe6b88bc3b28eaff) |

---

## Features

### For the Sender
- **Frictionless Gifting Experience (`/send`):** Connect Freighter wallet, xBull, or passkey. Pick from top global equities ($NVDA, $AAPL, $TSLA, etc.), select any dollar amount from $1 to $100 paid in Stellar XLM or USDC, and set an expiry window (7, 30, or 90 days).
- **Exact Approvals & Price Protection:** Every quote is pre-simulated against current ledger state before anything is signed. Approvals match the exact gift amount and never allow unlimited allowances. Slippage is bounded within 1%, guarded by an oracle circuit-breaker.
- **Client-Side Encrypted Notes:** Write a personal letter sealed in the browser using AES-GCM-256 with an ephemeral key derived from the claim secret. Only someone holding the full link with the hash fragment can decrypt and read the note.
- **Optional Anti-Sniffing PIN Protection:** Senders can lock the gift with an optional passphrase PIN so even if the link URL is sniffed in transit, it cannot be claimed without the sender's PIN.
- **Unpausable Refund Safeguard:** If the recipient never opens the gift before it expires, the sender reclaims 100% of the principal via the smart contract's unpausable `refund(giftId)` function.
- **Automated CLI Agent (`viapp`):** Command-line agent for automated corporate or individual gifting. Run automated recurring or threshold gifting scripts directly from your terminal.

### For the Recipient (Friend)
- **Zero Crypto Onboarding Barriers:** Open the link (`https://viapp.gift/g/{id}#{secret}`), tap "Sign in to open it", and authenticate with Google, email, or a biometric Stellar passkey. ViApp provisions a self-custodial Stellar account in seconds.
- **Gasless Claim:** The recipient does not need XLM for transaction fees. The ViApp relayer wraps the transaction in a Stellar fee-bump envelope and covers the network fee.
- **Zero Server-Side Key Leakage:** The secret claim key lives exclusively after the `#` hash fragment in the URL. Standard browsers never transmit hash fragments in HTTP request headers, ensuring servers never see the claim key.
- **Instant SDEX Liquidation:** Recipients can hold their stock to earn on-chain dividends, transfer it to friends, or **instantly liquidate** it for native Stellar USDC on the SDEX/Soroban AMM with a single tap.
- **Global Retail Cash-Out:** Recipients in 180+ countries can cash out their stock gifts for physical currency at over 400,000 MoneyGram retail locations worldwide.

### For Hackathon Judges & Security Auditors
- **Live On-Chain Verification:** Inspect the deployed Soroban contract on [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDEDHFJ7POEWDFFDRV74ZIWK4CSDKGEN4B4IQXUZHMKGVMJIVFODEV5M) with live ledger state reads.
- **Dedicated Judge Handout Section:** The home page includes a dedicated "For Judges" flow allowing evaluators to claim a free live test gift ($1 of NVDAB/AAPL) without spending personal funds.
- **60 Automated Security Attacks (All Refused):** Comprehensive attack vectors covering unauthorized claims, double spends, front-running, expired refunds, signature replay, and reentrancy.
- **Formally Verified Cryptographic Vectors:** EIP-712 / Ed25519 claim and registration digests verified against strict test vectors.

---

## X Layer (OKX xStocks) vs. BNB Chain (bStocks): Comparison & Allowlist

ViApp evaluates both institutional tokenized stock venues for behind-the-scenes reserve backing.

### Installed X Layer Tooling
The environment has the **`meirei`** skill installed (`~/.gemini/config/skills/meirei/SKILL.md`), powering AI-native investment mandates on **X Layer (Chain 196)**, alongside the complete OKX Onchain OS suite (`okx-agentic-wallet`, `okx-ai`, `okx-defi`, `okx-dex-market`, `okx-guide`, `okx-agent-payments-protocol`).

### Full Tradable Stock Allowlist on X Layer (Chain 196)

All 7 canonical tokenized stocks (xStocks) on X Layer are verified and integrated into ViApp's bridge router ([`packages/core/src/bridge.ts`](packages/core/src/bridge.ts)):

| Symbol | Company / Asset Name | Contract Address (X Layer Chain 196) | Decimals | Type |
|:---:|---|---|:---:|:---:|
| **AAPLx** | Apple Inc. xStock | `0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a` | 18 | Equity |
| **MSFTx** | Microsoft Corp xStock | `0x5621737f42dae558b81269fcb9e9e70c19aa6b35` | 18 | Equity |
| **NVDAx** | NVIDIA Corp xStock | `0xc845b2894dbddd03858fd2d643b4ef725fe0849d` | 18 | Equity |
| **GOOGLx**| Alphabet Inc. xStock | `0xe92f673ca36c5e2efd2de7628f815f84807e803f` | 18 | Equity |
| **AMZNx** | Amazon.com Inc. xStock | `0x3557ba345b01efa20a1bddc61f573bfd87195081` | 18 | Equity |
| **METAx** | Meta Platforms xStock | `0x96702be57cd9777f835117a809c7124fe4ec989a` | 18 | Equity |
| **TSLAx** | Tesla, Inc. xStock | `0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0` | 18 | Equity |
| **USDG**  | Global Dollar | `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8` | 6 | Settlement Cash |
| **USDC**  | USD Coin | `0xb6ceceab302e2e4948951ee7843fc24e92933061` | 6 | Settlement Cash |

*(Note: Canonical Alphabet ticker on X Layer is `GOOGLx`).*

### Tradable Stock Allowlist on BNB Chain (Chain 56)

| Symbol | Company / Asset Name | Contract Address (BNB Chain 56) | Decimals |
|:---:|---|---|:---:|
| **AAPLB** | Apple Inc. bStock | `0x431a3BEE82E2ca41e49895CbECE5bB0F76A89b7A` | 18 |
| **NVDAB** | NVIDIA Corp bStock | `0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436` | 18 |
| **TSLAB** | Tesla, Inc. bStock | `0x5b1910eAaD6450E50f816082Aa078C41F10C292f` | 18 |
| **MSFTB** | Microsoft Corp bStock | `0x80106cb3EAD06659A5ad19DF39D9b4733863B9b0` | 18 |
| **AMZNB** | Amazon.com Inc. bStock | `0x1a4b499833A79A09ad7Cf1D42D7DacF71e92eb00` | 18 |
| **GOOGLB**| Alphabet Inc. bStock | `0x3F53De71c126BdaBAe20f9cD64848d317f6C3238` | 18 |
| **METAB** | Meta Platforms bStock | `0x7425889FE94F9d693E8daefE88BCCed6AcFEf4c0` | 18 |
| **SPYB**  | SPDR S&P 500 ETF | `0x7138b48df7D98D7e3cc221BfE7192D0a178182D8` | 18 |
| **QQQB**  | Invesco QQQ Trust | `0x205812CdBed920aFf76C6580abD681a46D11efc7` | 18 |

---

### Comparison: Why X Layer (OKX xStocks) is Easier to Adapt

| Feature | X Layer (OKX xStocks via `meirei`) | BNB Chain (bStocks via Binance Web3) |
|---|---|---|
| **Programmatic Adaptation** | **Significantly Easier.** Unified REST API with direct DEX quote, swap, and market routes. | Complex. Requires HMAC-SHA256 request signing over timestamps, paths, and raw payloads. |
| **AI Agent Tooling** | **Native.** Powered by OKX Onchain OS and `meirei` agent skills with preflight mandate simulation. | Requires external CLI wrappers (`@binance/agentic-wallet`). |
| **Transaction Execution Costs** | **Sub-Cent (< $0.005).** Polygon CDK zkEVM L2 execution. | Higher ($0.05–$0.25). Subject to L1 gas spikes. |
| **Settlement Speeds** | Fast deterministic zkEVM batches (~1-2s). | BSC block times (~3s). |
| **Liquidity & Depth** | Institutional market makers & OKX DEX Aggregator. | Deep decentralized pools on PancakeSwap V3. |

> **ViApp Conclusion:** **X Layer (OKX xStocks) is easier to adapt programmatically** for autonomous agents and backend execution due to OKX Onchain OS's clean REST architecture and native agent support. ViApp leverages a dual-venue router ([`packages/core/src/bridge.ts`](packages/core/src/bridge.ts)) providing optimal price discovery across both.

---

## How It Works: End-to-End System Architecture

ViApp coordinates 4 key stages: stock selection & payment, Soroban vault escrow, URL hash key distribution, and gasless relayer claiming.

```mermaid
sequenceDiagram
  autonumber
  participant S as Sender (Freighter/Passkey)
  participant UI as ViApp Web App
  participant API as ViApp API / SEP Engine
  participant V as Soroban GiftVault Contract
  participant R as ViApp Relayer Wallet
  participant F as Recipient (Friend)

  S->>UI: 1. Select stock ($25 NVDA) & pay XLM/USDC
  UI->>API: 2. Request quote & routing (SEP-38 RFQ)
  API-->>UI: 3. Firm quote & simulated execution
  UI->>V: 4. Invoke create_gift(token, amount, claimKey, expiry, sealedNote)
  V-->>UI: 5. Tokens locked in escrow; giftId emitted
  UI->>UI: 6. Generate claim link: https://viapp.gift/g/{id}#{claimSecret}
  UI-->>S: 7. Link ready to share via WhatsApp, Telegram, Email, or SMS
  S->>F: 8. Shares the private gift link
  F->>UI: 9. Opens link; authenticates via Google/Privy embedded Stellar wallet
  F->>UI: 10. Signs claim proof with link's ephemeral key
  UI->>API: 11. POST /api/claim {giftId, recipient, signature}
  API->>R: 12. Verify signature & rate limits; trigger relayer
  R->>V: 13. Relayer invokes claim(giftId, recipient, signature) & pays gas
  V-->>F: 14. Stock transferred directly to friend's Stellar account!
```

---

## Direct Native Stellar Tokenization & Liquidation Roadmap (Beyond Pegged Assets)

While ViApp launches on Testnet using a 1:1 pegged synthetic asset architecture backed by custodial reserves (xStocks & bStocks), **our strategic roadmap moves beyond cross-chain pegging to directly tokenized and natively liquidated equities natively issued on the Stellar blockchain**.

### Key Advantages: Native Issuance & Liquidation vs. Pegged Assets

| Dimension | Phase 1: 1:1 Pegged Equities (Current Testnet) | Phase 2+: Directly Tokenized & Liquidated Stocks (Roadmap) |
|---|---|---|
| **Asset Issuance** | Synthetic SAC issuer on Stellar mapped to cross-chain contracts | **Direct native Stellar issuance** via **SEP-0008 (Regulated Assets)** & **SEP-0041** |
| **Cross-Chain Dependency** | Requires bridging transactions and multi-chain custody attestations | **Zero cross-chain bridges**; 100% native Stellar ledger state and security |
| **Liquidation Venue** | Backend bridge liquidation through external DEXs (PancakeSwap/OKX DEX) | **Direct on-chain liquidation** via Stellar SDEX orderbooks and Soroban AMMs |
| **Liquidation Settlement** | Multi-hop settlement to USDC/XLM | **Sub-second instantaneous settlement** directly to native Stellar USDC / XLM |
| **Counterparty & Bridge Risk** | Dependent on cross-chain bridge uptime and external RPC relays | **Zero bridge exploit vector**; cryptographic guarantees directly under Stellar consensus |
| **Corporate Actions (Dividends)**| Synthetic manual balance adjustments or cash credit | **Automated on-chain USDC dividend distributions** streamed to Stellar token holders |

### Pillars of Direct Stellar Tokenization & Liquidation

1. **Direct Native Issuance on Stellar (SEP-0008 / SEP-0041):**
   - Stocks are minted natively on Stellar by licensed broker-dealers and qualified custodians.
   - Compliance checks, investor whitelisting, and sanctions screening operate directly on-chain using SEP-0008 authorization flags (`AUTH_REQUIRED`, `AUTH_REVOCABLE`, `AUTH_CLAWBACK_ENABLED`).
2. **Direct On-Chain Liquidation (Instant Cash-Out 24/7):**
   - Recipients who claim a gifted stock can **instantly liquidate** it 24/7 directly on the Stellar Decentralized Exchange (SDEX) and Soroban AMM liquidity pools (e.g. `AAPL/USDC`, `NVDA/USDC`).
   - Settlement occurs in **sub-seconds** with **sub-cent transaction fees (< $0.0001)**, converting stock tokens directly into spendable Stellar USDC or XLM.
   - Users can then immediately spend their funds via Stellar debit cards or cash out at retail locations worldwide via **MoneyGram Access**.
3. **Automated On-Chain Corporate Actions:**
   - Real equity ownership benefits: When underlying companies pay cash dividends, the issuing anchor streams USDC directly to all on-chain token holders based on ledger balance snapshots.

---

## Stellar Ecosystem Proposals (SEPs) Compliance

ViApp is architected as native Stellar infrastructure adhering to standard SEPs:

1. **SEP-0001 (Stellar Info File):** Resolves `stellar.toml` metadata, currency issuance, and anchor API routes. Implemented in [`packages/core/src/sep1.ts`](packages/core/src/sep1.ts).
2. **SEP-0010 (Stellar Web Authentication):** Challenge transaction generation and signature verification for secure client-relayer authentication. Implemented in [`packages/core/src/sep10.ts`](packages/core/src/sep10.ts).
3. **SEP-0024 (Hosted Deposit and Withdrawal):** Interactive deposit/withdrawal flows for fiat on-ramping straight into gifts. Implemented in [`packages/core/src/sep24.ts`](packages/core/src/sep24.ts).
4. **SEP-0038 (Anchor RFQ Quotes API):** Standardized price discovery and firm quote requests for converting Stellar XLM/USDC into tokenized equities. Implemented in [`packages/core/src/sep38.ts`](packages/core/src/sep38.ts).
5. **SEP-0041 (Stellar Asset Contract):** Direct token escrow using standardized Soroban token contract interfaces (`transfer`, `balanceOf`, `allowance`).

---

## Developer Quick Start & Environment Reference

### Quick Start
```bash
# Clone the repository
git clone https://github.com/ibochivincent-lang/viapp.git
cd viapp

# Install dependencies across all workspaces
npm install

# Run all TypeScript test suites (508 core tests, 59 agent tests)
npm test

# Run Soroban smart contract tests (Rust)
cd packages/contracts/stellar && cargo test
```

### Environment Configuration (`.env.example`)

Copy `.env.example` to `.env` at the repository root and configure the required keys:

| Environment Variable | Category | Description | Where to Get It |
|---|---|---|---|
| `STELLAR_NETWORK` | Stellar | Stellar network target (`testnet` or `public`) | Default: `testnet` |
| `STELLAR_RPC_URL` | Stellar | Stellar Soroban RPC endpoint | `https://soroban-testnet.stellar.org` |
| `NEXT_PUBLIC_STELLAR_NETWORK` | Client | Client-side Stellar network identifier | Default: `testnet` |
| `NEXT_PUBLIC_STELLAR_VAULT_CONTRACT_ID` | Client | Deployed Soroban GiftVault contract ID | `CDEDHFJ7POEWDFFDRV74ZIWK4CSDKGEN4B4IQXUZHMKGVMJIVFODEV5M` |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Auth | Privy embedded wallet application ID | [dashboard.privy.io](https://dashboard.privy.io) |
| `DEPLOYER_PRIVATE_KEY` | Deployer | Stellar / EVM deployer secret key | Your funded deployment account |
| `RELAYER_PRIVATE_KEY` | Relayer | Private key used by the gasless claim relayer | Dedicated relayer keypair |
| `VIAPP_RELAYER_ADDRESS` | Relayer | Public address of the relayer account | Public key of `RELAYER_PRIVATE_KEY` |
| `VIAPP_OWNER_ADDRESS` | Admin | Protocol admin account for token listing & pause | Admin account public key |
| `UPSTASH_REDIS_REST_URL` | Cache | Upstash Redis REST URL for rate limits & locks | [console.upstash.com](https://console.upstash.com) |
| `UPSTASH_REDIS_REST_TOKEN` | Cache | Upstash Redis REST access token | Upstash Redis dashboard |
| `VIAPP_PUBLIC_ORIGIN` | Web | Canonical public URL for gift links | E.g. `https://viapp.gift` |
| `VIAPP_JUDGE_CODE` | Judge | Secret passcode for hackathon judge claims | Submission documentation |
| `VIAPP_JUDGE_SEED` | Judge | 32-byte hexadecimal seed for deriving judge claim keys | Secure random generator |

---

## Repository Structure

```
viapp/
├── .github/workflows/ci.yml       # Automated GitHub Actions CI for Rust & TypeScript
├── docs/
│   ├── ARCHITECTURE.md            # Detailed protocol specification & Mermaid diagrams
│   ├── GRANT_PROPOSAL.md          # Stellar Community Fund (SCF) Tier-2 Proposal ($60k)
│   ├── ROADMAP.md                 # Native tokenization & direct on-chain liquidation roadmap
│   ├── assets/screenshots/        # UI screenshots & certificate previews
│   └── security/                  # Threat model, system descriptions & 60 attack refusal proofs
├── packages/
│   ├── contracts/stellar/         # Soroban smart contract (Rust + wasm32v1-none)
│   │   ├── contracts/viapp-gift-vault/src/lib.rs # Core GiftVault contract
│   │   ├── tests/test_vault.rs    # Rust Soroban integration tests (5 passing)
│   │   └── scripts/               # One-click Testnet deployment scripts
│   ├── core/                      # Protocol core library
│   │   ├── src/bridge.ts          # Multi-venue X Layer / BSC reserve router & allowlists
│   │   ├── src/checks.ts          # Oracle circuit breakers, PIN protection & sanctions
│   │   ├── src/sep1.ts            # SEP-0001 stellar.toml parser
│   │   ├── src/sep10.ts           # SEP-0010 Stellar WebAuth challenge validator
│   │   ├── src/sep24.ts           # SEP-0024 Hosted Deposit and Withdrawal
│   │   ├── src/sep38.ts           # SEP-0038 Anchor RFQ Quotes API client
│   │   ├── src/stocks-stellar.ts  # Tokenized equities catalog & pricing logic
│   │   └── test/                  # 508 TypeScript test cases & property-based fuzz tests
│   ├── web/                       # Next.js 15 Web Application with Stellar UI
│   └── agent/                     # ViApp CLI Agent
├── vercel.json                    # 1-Click Front-End production deployment configuration
└── package.json                   # Monorepo workspace configuration
```

---

## License

Apache 2.0 License. Copyright (c) 2026 ibochivincent.lang.
