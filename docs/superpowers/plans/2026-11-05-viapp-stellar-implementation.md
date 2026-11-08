# viapp Dual-Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implement the dual-chain tokenized stock gifting platform on Stellar and Binance with 100% design preservation, Soroban smart contract custody, and frictionless cryptographic link claiming.

**Architecture:** A monorepo consisting of `@viapp/core` (cryptographic link protocol, note encryption, dual-chain stock quotes), `packages/contracts/stellar` (Soroban Rust `GiftVault`), `@viapp/web` (Next.js App Router front-end with preserved luxury dark aesthetic), and backend sponsored relayer / x402 wrapping services.

**Tech Stack:** Next.js 16 / React 19, TypeScript, TailwindCSS, `@stellar/stellar-sdk` v14+, Soroban SDK (Rust), Viem, Web Crypto (AES-256-GCM, HKDF-SHA256, Ed25519, Secp256k1), Vitest.

**Spec:** [`docs/superpowers/specs/2026-11-05-viapp-stellar-design.md`](file:///C:/Users/User/.gemini/antigravity/scratch/viapp/docs/superpowers/specs/2026-11-05-viapp-stellar-design.md)

## Global Constraints
- Preserve 100% of the UI design, theme (`#0e0809` obsidian, `#1a1012` raised burgundy, gold `#f2b13d`), Georgia serif typography, grain texture, and `CallSheet` step tracker.
- Secret claim keys must reside strictly in the URL `#` fragment and must never be transmitted across network requests.
- All notes must be encrypted with AES-256-GCM with a 12-byte fresh IV and cap at 483 UTF-8 plaintext bytes.
- Soroban contract must verify Ed25519 signatures on-chain via `env.crypto().ed25519_verify`.
- Refunds for expired gifts must remain strictly unpausable so sender funds can never be locked.

## Review Focus
1. Link parsing with malformed fragments or invalid characters fails closed with `LinkError("damaged")`.
2. Ed25519 registration proofs bind the sender address to prevent transaction front-running.
3. Expiry timestamps are strictly enforced between 1 hour and 90 days.
4. Relayer-only claim submissions prevent nonce collision and ensure fee sponsorship for recipients.
5. Exact liability accounting per token ensures surplus rescue cannot touch active gift balances.

---

### Task 1: Complete and Verify `@viapp/core` Stellar Integration

**Files:**
- Modify: `packages/core/src/quote.ts`
- Modify: `packages/core/src/stocks.ts`
- Create: `packages/core/test/quote-unified.test.ts`

**Interfaces:**
- Consumes: `handleStellarQuote` from `stocks-stellar.ts`, `parseClaimKey`, `parseLink` from `gift.ts`.
- Produces: Unified `handleQuote` and `handleStocks` supporting both `stellar` and `bnb`.

- [x] **Step 1: Write unified quote and stocks test**
Write `packages/core/test/quote-unified.test.ts` verifying that `handleQuote` and `handleStocks` route correctly based on `chain: "stellar"` vs `chain: "bnb"`.

- [x] **Step 2: Run test to verify initial failure**
Run: `node ../../node_modules/vitest/vitest.mjs run test/quote-unified.test.ts`
Expected: FAIL

- [x] **Step 3: Update `quote.ts` and `stocks.ts`**
Implement the routing to `handleStellarQuote` and `getStellarStocks` when `chain === "stellar"` or wallet starts with `G`.

- [x] **Step 4: Run test to verify it passes**
Run: `node ../../node_modules/vitest/vitest.mjs run test/quote-unified.test.ts`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add packages/core/src/quote.ts packages/core/src/stocks.ts packages/core/test/quote-unified.test.ts
git commit -m "feat(core): route unified quote and stocks handlers for Stellar and Binance"
```

---

### Task 2: Implement the Soroban `GiftVault` Smart Contract in Rust

**Files:**
- Create: `packages/contracts/stellar/Cargo.toml`
- Create: `packages/contracts/stellar/src/lib.rs`
- Create: `packages/contracts/stellar/src/types.rs`
- Create: `packages/contracts/stellar/src/errors.rs`

**Interfaces:**
- Consumes: `soroban-sdk` v22+.
- Produces: Soroban `GiftVault` contract with `initialize`, `create_gift`, `claim`, `refund`, and admin controls.

- [x] **Step 1: Create Cargo.toml for Soroban crate**
Configure `packages/contracts/stellar/Cargo.toml` with `crate-type = ["cdylib"]`, `soroban-sdk = "22"`.

- [x] **Step 2: Implement types and error enums**
Implement `State` (None, Open, Claimed, Refunded), `Gift`, `DataKey`, and `VaultError` in `types.rs` and `errors.rs`.

- [x] **Step 3: Implement contract functions in `lib.rs`**
Implement `create_gift` (with Ed25519 anti-frontrunning verification and token transfer), `claim` (with Ed25519 claim verification and transfer to recipient), `refund` (unpausable expired return), and admin functions.

- [x] **Step 4: Compile crate with cargo**
Run: `cargo check --manifest-path packages/contracts/stellar/Cargo.toml`
Expected: Compilation success with 0 errors.

- [x] **Step 5: Commit**
```bash
git add packages/contracts/stellar/
git commit -m "feat(contracts): implement Soroban GiftVault smart contract in Rust"
```

---

### Task 3: Author and Run the Soroban Test Suite

**Files:**
- Create: `packages/contracts/stellar/tests/test_vault.rs`

**Interfaces:**
- Consumes: `GiftVaultClient` from `lib.rs`, mock SAC token clients.
- Produces: Complete invariant test coverage for all gift lifecycle events.

- [x] **Step 1: Write integration tests in `test_vault.rs`**
Write tests covering:
1. `test_create_gift_success`
2. `test_create_gift_invalid_proof`
3. `test_claim_success`
4. `test_claim_wrong_signature`
5. `test_claim_expired_fails`
6. `test_refund_expired_success`
7. `test_unpausable_refund`

- [x] **Step 2: Run cargo test**
Run: `cargo test --manifest-path packages/contracts/stellar/Cargo.toml`
Expected: All tests pass.

- [x] **Step 3: Commit**
```bash
git add packages/contracts/stellar/tests/
git commit -m "test(contracts): add full Soroban GiftVault invariant test suite"
```

---

### Task 4: Connect Stellar Client and Deployment Helper to `@viapp/core`

**Files:**
- Create: `packages/core/src/client/stellar.ts`
- Create: `packages/core/src/client/deploy-stellar.ts`
- Test: `packages/core/test/stellar-client.test.ts`

**Interfaces:**
- Consumes: `@stellar/stellar-sdk`, `GiftVault` compiled contract.
- Produces: Helpers to build createGift transaction XDR, simulate, and invoke Soroban methods.

- [x] **Step 1: Write unit tests for Stellar transaction builders**
Test building `create_gift` Soroban invocation XDR and parsing receipts.

- [x] **Step 2: Implement `stellar.ts` client methods**
Implement `buildCreateGiftTx`, `buildClaimTx`, and `buildRefundTx` with proper Soroban `Contract` invocations.

- [x] **Step 3: Run client tests**
Run: `node ../../node_modules/vitest/vitest.mjs run test/stellar-client.test.ts`
Expected: PASS

- [x] **Step 4: Commit**
```bash
git add packages/core/src/client/stellar.ts packages/core/test/stellar-client.test.ts
git commit -m "feat(core): add Stellar Soroban transaction builder client"
```

---

### Task 5: Update Frontend with Dual-Chain Support & Exact Design Preservation

**Files:**
- Modify: `packages/web/components/send/SendPage.tsx`
- Modify: `packages/web/components/send/SendForm.tsx`
- Modify: `packages/web/components/send/StockPicker.tsx`
- Modify: `packages/web/components/nav/SiteNav.tsx`
- Modify: `packages/web/components/hero/Hero.tsx`
- Modify: `packages/web/components/claim/ClaimPage.tsx`

**Interfaces:**
- Consumes: `@viapp/core` dual-chain APIs, Freighter wallet adapter.
- Produces: Complete UI with network toggle, Stellar tokenized stocks, and preserved dark luxury styling.

- [x] **Step 1: Update `SiteNav.tsx` and `Hero.tsx` branding**
Replace "ViApp" with "viapp" in logo, titles, and text while preserving the exact Georgia serif font, spacing, and styling.

- [x] **Step 2: Add ChainSelector in `SendForm.tsx`**
Add a segmented control button (`Stellar` / `Binance`) matching the dark luxury button theme.

- [x] **Step 3: Update `StockPicker.tsx`**
Display Stellar tokenized equities (AAPL, NVDA, TSLA, etc.) when Stellar is active, and bStocks when Binance is active.

- [x] **Step 4: Update `ClaimPage.tsx`**
Handle Stellar `/g/stellar/:id#S...` links, unseal the note using `openNote`, and display the claim confirmation.

- [x] **Step 5: Verify build**
Run: `npm run typecheck --workspace=@viapp/web`
Expected: PASS with 0 type errors.

- [x] **Step 6: Commit**
```bash
git add packages/web/
git commit -m "feat(web): update UI with dual-chain selector, Stellar stocks, and viapp branding"
```

---

### Task 6: Implement Sponsored Relayer and x402 Gift Wrap APIs

**Files:**
- Modify: `packages/core/src/claim.ts`
- Modify: `packages/core/src/wrap.ts`
- Test: `packages/core/test/claim-stellar.test.ts`

**Interfaces:**
- Consumes: Relayer Stellar keypair, x402 facilitator.
- Produces: Working `/api/claim` and `/api/wrap/{id}` endpoints.

- [x] **Step 1: Implement Stellar claim submission in `claim.ts`**
Relayer signs and broadcasts `GiftVault.claim(...)` for Stellar gifts, paying all transaction and resource fees.

- [x] **Step 2: Implement Stellar x402 wrapping fee in `wrap.ts`**
Answer HTTP 402 with USDC requirements on Stellar, verify payment signature, and mark gift wrapped.

- [x] **Step 3: Write tests for Stellar claim and wrap**
Verify signature verification, replay protection, and error handling.

- [x] **Step 4: Run tests**
Run: `node ../../node_modules/vitest/vitest.mjs run test/claim-stellar.test.ts`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add packages/core/src/claim.ts packages/core/src/wrap.ts packages/core/test/claim-stellar.test.ts
git commit -m "feat(core): implement Stellar sponsored relayer claim and x402 wrapping"
```

