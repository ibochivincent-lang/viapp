# ViApp Protocol Architecture

ViApp enables anyone to send a friend their first real tokenized stock (Apple, NVIDIA, Tesla, S&P 500) as a shareable link. The recipient claims the share using Google, email, or a Stellar passkey with no seed phrase, no browser extension, and zero transaction fees.

For the comprehensive Stellar specification, live testnet contract verifications, and protocol sequence diagrams, see:
- [Stellar Protocol Architecture Specification](docs/ARCHITECTURE.md)
- [Native Tokenization & Direct Liquidation Roadmap](docs/ROADMAP.md)
- [Stellar Community Fund (SCF) Proposal](docs/GRANT_PROPOSAL.md)

---

## 1. High-Level System Overview

```mermaid
flowchart TD
    subgraph Client["Client Interface"]
        Sender["Gift Sender\n(XLM / USDC on Stellar)"]
        Recipient["Gift Recipient\n(Web Browser / Google / Passkey)"]
    end

    subgraph AppLayer["Application Layer (@viapp/web)"]
        UI["ViApp Web App\n(Next.js 16 + Tailwind)"]
        Relayer["ViApp Gasless Relayer\n(Submits claim transactions)"]
    end

    subgraph CoreLayer["Core Protocol (@viapp/core)"]
        StellarClient["Soroban SDK Transaction Builders"]
        SEP["SEP Engine\n(SEP-1, SEP-10, SEP-24, SEP-38, SEP-41)"]
        Bridge["Pegging & Native Settlement Engine"]
    end

    subgraph OnChain["Stellar Network (Soroban)"]
        Vault["GiftVault Smart Contract\nCDEDHFJ7POEWDFFDRV74ZIWK4CSDKGEN4B4IQXUZHMKGVMJIVFODEV5M"]
        SAC["Stellar Asset Contracts\n(Native XLM, USDC, Stocks)"]
        SDEX["Stellar SDEX & Soroban AMM\n(Direct On-Chain Liquidation)"]
    end

    Sender -->|1. Select Stock & Pay XLM/USDC| UI
    UI --> CoreLayer
    CoreLayer -->|2. Create Gift & Lock Tokens| Vault
    Vault -->|3. Escrow Tokens| SAC
    UI -->|4. Generate Claim Link| Sender
    Sender -.->|5. Sends Link (SMS / WhatsApp / Email)| Recipient
    Recipient -->|6. Opens Link & Authenticates| UI
    UI -->|7. Signed Claim Payload| Relayer
    Relayer -->|8. Submits gasless claim()| Vault
    Vault -->|9. Transfers Stock to Recipient| SAC
    Recipient -.->|10. 1-Click Liquidation| SDEX
```

---

## 2. Deployed Soroban Smart Contract & Live Testnet Evidence

- **Contract ID:** [`CDEDHFJ7POEWDFFDRV74ZIWK4CSDKGEN4B4IQXUZHMKGVMJIVFODEV5M`](https://stellar.expert/explorer/testnet/contract/CDEDHFJ7POEWDFFDRV74ZIWK4CSDKGEN4B4IQXUZHMKGVMJIVFODEV5M)
- **WASM Hash:** `89cfaedb8f5c3933e47dbb6f5eed3f182a31ed972738f60ef61efbd6b2f85266`
- **Deploy Transaction:** [`8675102f...4be5`](https://stellar.expert/explorer/testnet/tx/8675102f1054b1322c73c378ad28f42ad1ab094dfcea556c4266e62db48b4be5)
- **Live Gift Creation Tx:** [`ad2a84c5...ae94`](https://stellar.expert/explorer/testnet/tx/ad2a84c5d2dbda6d4c43c9abe7f45916c5e9a107aa3e3bdaf9f8b05d1164ae94)
- **Live Gasless Claim Tx:** [`21d69188...eaff`](https://stellar.expert/explorer/testnet/tx/21d69188fc46dbee51e4c1f5c138f3dd0654ef8b0af8fd8ebe6b88bc3b28eaff)
