# viapp System Design Specification: Dual-Chain Tokenized Stocks on Stellar & Binance

**Date**: 2026-11-05  
**Project**: viapp (formerly Moi)  
**Repository**: [https://github.com/ibochivincent-lang/viapp](https://github.com/ibochivincent-lang/viapp)  
**Status**: Approved Design  

---

## 1. Executive Summary

**viapp** is a dual-chain Web3 gifting protocol that enables anyone to send real tokenized company shares (Apple, NVIDIA, Tesla, Microsoft, etc.) or digital assets as an encrypted link. 

The recipient opens the link and owns real shares in seconds with **zero crypto knowledge, no seed phrase, and zero network fees**.

viapp operates across two ecosystems:
1. **Stellar Network**: Soroban smart contract custody (`GiftVault`), Stellar Asset Contract (SAC / SEP-41) tokens, Stellar SDEX / AMM swaps, and native gas sponsorship via fee-bump or sponsored relayer.
2. **Binance Smart Chain (BNB)**: Solidity smart contract custody (`GiftVault.sol`), bStocks, and Binance Web3 Trading API.

---

## 2. Design System & UI/UX Preservation

viapp retains 100% of the visual aesthetic, layout, components, and design language from the original project:
- **Palette**: Dark luxury palette:
  - Background: `--bg: #0e0809` (deep obsidian black)
  - Card Surface: `--bg-raised: #1a1012` (dark burgundy tint)
  - Text: `--ink: #f6efe6` (soft warm ivory) & `--ink-muted: #b9aea4`
  - Accent: `--gold: #f2b13d` & `--gold-deep: #c8891e`
  - Accent Maroon: `--maroon: #4a1420`
  - Borders: `--line: rgba(246, 239, 230, 0.12)`
- **Typography**: Georgia serif display font with delicate italics paired with clean system sans-serif and monospace digits.
- **Visual Elements**: Subtle SVG grain texture (`Grain.tsx`), 3D visual canvas (`Hero.tsx`), step-by-step transaction tracker (`CallSheet.tsx`), gold foil gift link card (`LinkCard.tsx`), and the sealed gift opening animation.
- **Copy & Branding**: Rebranded from "Moi" to **"viapp"**, adding seamless chain selection between Stellar and Binance.

---

## 3. Cryptographic Link & Security Model

The security model adheres to strict invariants (C1 to C50):

### 3.1 Link Fragment Isolation
- Gift links take the form:
  - **Stellar**: `https://viapp.me/g/stellar/{giftId}#{claimSecret}` (where `claimSecret` is an Ed25519 seed starting with `S`, 56 base32 chars).
  - **BNB**: `https://viapp.me/g/bnb/{giftId}#{claimSecret}` (where `claimSecret` is a 64-hex secp256k1 private key).
- In accordance with **RFC 3986**, the fragment following `#` is strictly evaluated in client-side memory and **never transmitted across HTTP headers or server logs**.
- The claim page strips the fragment from the browser address bar immediately upon load.

### 3.2 Note Sealing & Unsealing
- Sealed notes are encrypted symmetrically via Web Crypto:
  - Algorithm: **AES-256-GCM** with 12-byte random IV and 16-byte authentication tag.
  - Key Derivation: **HKDF-SHA256** from the 32 raw bytes of the claim secret.
  - Salt: `viapp-note-v1` (with backward-compatible decoding for `moi-note-v1`).
  - Max note plaintext: 483 UTF-8 bytes (512 bytes on-chain ciphertext cap).

### 3.3 Anti-Frontrunning Registration Proof
- When creating a gift, the creator proves ownership of the claim key:
  - **Stellar**: Signs `sha256("viapp:register:{network}:{vaultContractId}:{senderAddress}")` with the Ed25519 secret.
  - **BNB**: Signs EIP-712 typed data `RegisterGift(address sender)`.
- Prevents frontrunning miners or relayers from binding someone else's claim key to their own transaction.

### 3.4 Claim Signature
- When the friend claims the gift, the browser signs the recipient address:
  - **Stellar**: Signs `sha256("viapp:claim:{network}:{vaultContractId}:{giftId}:{recipientAddress}")`.
  - **BNB**: Signs EIP-712 typed data `Claim(uint256 giftId, address recipient)`.
- The relayer submits this signature on-chain. The vault verifies the signature against the stored public claim key before transferring tokens. The relayer cannot alter the recipient address.

---

## 4. Dual-Chain Stock Purchasing Architecture

| Feature | Stellar Network | Binance Smart Chain |
| :--- | :--- | :--- |
| **Available Equities** | AAPL, NVDA, TSLA, MSFT, AMZN, GOOGL, META, SPY, QQQ, USDC, XLM | AAPLB, NVDAB, TSLAB, MSFTB, AMZNB, GOOGLB, METAB, SPYB, QQQB |
| **Token Standard** | Stellar Asset Contract (SAC / SEP-41) | ERC-20 (`bStock`) |
| **Trading Source** | Stellar SDEX (Path Payment Strict Receive) & Soroswap AMM | Binance Web3 Aggregator API (`/quote`, `/swap`) |
| **Settlement Speed** | ~4 seconds (single-ledger finality) | ~3 seconds (BNB PoSA) |
| **Transaction Cost** | <$0.001 (fractions of a cent) | ~$0.05–$0.20 |
| **Gift Wrap Micro-fee** | Stellar x402 / MPP ($0.05 USDC) | Binance b402 ($0.05 USDT) |

---

## 5. Smart Contract Architecture (`GiftVault` on Soroban)

### 5.1 Storage Layout
- **Instance Storage**:
  - `Admin`: `Address`
  - `Relayer`: `Address`
  - `NextGiftId`: `u64`
  - `IsPaused`: `bool`
- **Persistent Storage**:
  - `Gift(u64)`: `Gift` struct `{ token, sender, claim_key, amount, expiry, state, sealed_note }`
  - `ClaimKeyUsed(BytesN<32>)`: `bool`
  - `IsListed(Address)`: `bool`
  - `ListedTokens`: `Vec<Address>`
  - `Liabilities(Address)`: `i128`

### 5.2 Core State Invariants
- **C1 (One-Time Payout)**: State transitions to `Claimed` strictly **before** the token transfer.
- **C2 (Domain Separation)**: Digests bind the contract ID, network passphrase, and gift ID.
- **C3 (Caps & Bounds)**: Amount > 0, expiry between 1 hour and 90 days, note length $\le$ 512 bytes.
- **C5 (Unpausable Refund)**: Expired gifts can always be refunded to the original sender, even if the contract is paused.
- **C10 (Liability Accounting)**: Vault maintains exact liability balances per token; surplus cannot be withdrawn below liabilities.

---

## 6. Implementation Modules

1. **`packages/core`**:
   - `src/gift.ts`: Dual-chain claim key generator, link parser, AES-256-GCM note sealer, and Ed25519/secp256k1 signers.
   - `src/stocks-stellar.ts`: Stellar equities catalog and SAC contract ID resolver.
   - `src/quote-stellar.ts`: Stellar SDEX/AMM quotation engine with slippage protection.
2. **`packages/contracts/stellar`**:
   - Rust Soroban crate: `Cargo.toml`, `src/lib.rs` (`GiftVault`), unit tests in `tests/test_vault.rs`.
3. **`packages/web`**:
   - Preserves all UI components (`SendPage`, `CallSheet`, `StockPicker`, `LinkCard`, `Hero`, `Grain`).
   - Updates branding to **viapp**.
   - Integrates Stellar network selector and Stellar Wallets Kit alongside Privy/EVM.
4. **`packages/agent`**:
   - CLI tool `viapp` for automated gifting via command line or agentic workflows.

