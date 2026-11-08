# ViApp: System Description

Functional description of the ViApp protocol on Stellar, covering architecture, trust boundaries, components, and protocol lifecycles.

## What ViApp Does

A person (the sender) gives another person (the friend) a real share of a US company (e.g. Apple, NVIDIA, Tesla, Microsoft, Alphabet, Amazon, Meta) as a tokenized stock on Stellar. The sender pays in native USDC or XLM on Stellar. The friend receives a shareable gift link, opens it in a browser, signs in with Google, email, or a biometric Stellar passkey (zero seed phrases, zero wallet apps), and the tokenized equity is transferred into their non-custodial Stellar wallet.

Under current deployment, tokenized stocks are backed 1:1 by institutional reserves across X Layer (OKX `xStocks`) and BNB Chain (`bStocks`), locked in ViApp's Soroban `viapp-gift-vault` contract. The protocol's active roadmap transitions directly to native tokenization and direct on-chain liquidation on the Stellar Decentralized Exchange (SDEX).

## Core Components

1. **Web Application** (Next.js 15, React 19). Public pages: landing page with certificate & interactive envelope preview, stock picker (`/send`), claim page (`/g/[id]`), interactive docs (`/docs`), and judge verification portal. Runs client-side in the browser.
2. **ViApp API & Relayer Server** (Next.js Edge and Node Route Handlers):
   - `GET /api/stocks`: Live catalog of giftable stocks (symbols, real-time prices, market status, Stellar SAC addresses).
   - `POST /api/quote`: Given a stock code and USD budget, calculates the required USDC/XLM on Stellar with slippage and oracle price deviation guards.
   - `POST /api/claim`: Submits the claim transaction to the Stellar Soroban network signed by ViApp's relayer, paying network fees so the recipient pays $0 in gas.
   - `POST /api/wrap`: Handles the 5-cent gift wrap fee payment and attestation.
   - `GET /api/gift/:id`: Public on-chain status of a gift (token, amount, expiry, state, sealed note) read directly from the Stellar Soroban RPC.
3. **Relayer Service**: A server-held Stellar keypair funded with a pool of XLM. It wraps claim transactions in Stellar fee-bump envelopes, guaranteeing seamless onboarding for new users without requiring them to hold crypto or XLM reserves.
4. **Soroban Smart Contract (`viapp-gift-vault`)**: Deployed on Stellar (`CDEDHFJ7POEWDFFDRV74ZIWK4CSDKGEN4B4IQXUZHMKGVMJIVFODEV5M`), written in Rust with the Soroban SDK.
   - `create_gift(sender, token, amount, claim_key, expiry, sealed_note, key_proof)`: Locks tokenized stock in the vault, binds it to the ephemeral claim public key, and sets TTL/expiration.
   - `claim(gift_id, recipient, signature)`: Validates cryptographic signature from the claim key over `(gift_id, recipient)`, verifies sanctions/geo-blocking compliance, and transfers stock to `recipient`.
   - `refund(gift_id)`: Unlocks and returns expired, unclaimed stock to the original sender.
   - Protocol Admin functions: pause/unpause, update listed token registry, manage relayer authorization, and maintain contract instance TTL.
5. **The Gift Link**: `https://<viapp-domain>/g/<giftId>#<claimKeyPrivateKey>`. The claim key is an ephemeral cryptographic keypair generated client-side in the sender's browser. The public key is stored in the Soroban contract; the private key exists strictly in the URL fragment (`#`), which browsers never transmit to the server.
6. **Recipient Non-Custodial Wallet**: Created seamlessly via embedded wallet / Stellar passkey providers. No seed phrase required; private keys can be exported or recovered at any time.
7. **ViApp Sender Agent (CLI)**: Command-line autonomous agent (`@viapp/agent`) for automated programmatic gifting, portfolio rebalancing, and headless integration.
8. **Multi-Venue Backing Adapter**: Real-time quoting and reserve custody across:
   - **X Layer (OKX xStocks, Chain 196)**: Programmatic execution via OKX Onchain OS APIs.
   - **BNB Chain (bStocks, Chain 56)**: Institutional reserve custody.
   - **Stellar Native SDEX**: Target architecture for direct issuance and on-chain orderbook liquidation.
9. **Shared Store (Upstash Redis / Memory Store)**: Ephemeral storage for rate-limiting counters (IPv4 `/32`, IPv6 `/64`), daily relayer gas budgets, deduplication nonces, and anti-replay locks.

## Trust Boundaries & Security Invariants

- **Zero-Custody Sender Funds**: Senders sign transactions directly from their browser or agent wallet; ViApp server never holds sender private keys.
- **Fragment Secrecy**: The link key is isolated in the URL fragment (`#`), ensuring intermediate web servers or CDNs cannot read or steal claim keys.
- **PIN Anti-Sniffing**: Optional AES-GCM encryption with sender-defined PIN prevents link interception in transit.
- **Relayer Isolation**: Relayer keys only possess authority to submit verified claim transactions; they cannot divert vault tokens to arbitrary addresses.
- **Owner Key Separation**: Protocol administrative keys are stored off-server in cold storage.
