<p align="center"><img src="packages/web/public/v-mark.svg" alt="ViApp" width="64"></p>

# ViApp: Tokenized Equities & Gift Vault on Stellar

Send someone their first share of Apple, NVIDIA, or Tesla as a link. The recipient signs in with Google, email, or a Stellar passkey and owns a real share on Stellar with no pre-funded crypto, no wallet setup hurdles, and zero gas fees.

Everything on ViApp's user surface runs natively on **Stellar**: users pay in **XLM or USDC on Stellar**, gifts are locked in a **Soroban Smart Contract**, and tokenized equities are held, gifted, and transferred directly on the Stellar network. While current Testnet deployment features 1:1 pegged assets backed by institutional reserves, **ViApp's active roadmap transitions directly to natively tokenized and directly liquidated stocks issued on the Stellar blockchain rather than remaining pegged**.

[Architecture Specification](docs/ARCHITECTURE.md) · [Technical & Product Roadmap](docs/ROADMAP.md) · [SCF Grant Proposal](docs/GRANT_PROPOSAL.md) · [CI Pipeline](.github/workflows/ci.yml)

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

## Supported Pegged Equities on Stellar

ViApp supports 9 major equities pegged 1:1 on Stellar. The sender pays with native **XLM** or **USDC on Stellar**, the gift is held in Soroban smart contract custody, and the underlying equity is backed by institutional custody:

| Symbol | Company / Asset Name | Stellar SAC Address (Soroban) | Backing Venue | Backing Contract Address | Peg Ratio |
|:---:|---|---|:---:|---|:---:|
| **$AAPL** | Apple Inc. | `CCAPPOAZYAHIJVWFQFTL3AUPCVRADODVIFTXQZ2GMAYMYPLUPA3PRMYB` | BNB Chain (bStock) | `0x4dd8cb5f44e3f421be0d58852da0e28f32242186` | 1:1 |
| **$NVDA** | NVIDIA Corp | `CCU5ABICR2MGWDRYS66DHG2XFFVEAH3L24RW7YVJG2V64JZNAKDFN273` | BNB Chain (bStock) | `0x02fca66c1d1afb4e2a7884261eb00f63598a7436` | 1:1 |
| **$TSLA** | Tesla, Inc. | `CCB43KY52JEQQGWPG7EAMJQAIQN3JGRCB32BWLEIQYZXMKGC54OGGIMV` | BNB Chain (bStock) | `0x12bb94481d81fbe3237e1ba77a83d3170e59a6d8` | 1:1 |
| **$MSFT** | Microsoft Corp | `CBRV67QJ2JEQQGWPG7EAMJQAIQN3JGRCB32BWLEIQYZXMKGC54OGGIMV` | BNB Chain (bStock) | `0x8929e083cbe9a296e8bc371c6fa611fe28114fcf` | 1:1 |
| **$AMZN** | Amazon.com Inc | `CA6Z342J2JEQQGWPG7EAMJQAIQN3JGRCB32BWLEIQYZXMKGC54OGGIMV` | BNB Chain (bStock) | `0xa8417c8cf15239a5ec13e9a7e6b010f3c5b557fb` | 1:1 |
| **$GOOGL** | Alphabet Inc | `CBVTR42J2JEQQGWPG7EAMJQAIQN3JGRCB32BWLEIQYZXMKGC54OGGIMV` | BNB Chain (bStock) | `0x539591e6005cbbce4ebcc47cfdc3500d8ce20c6a` | 1:1 |
| **$META** | Meta Platforms | `CCQWP42J2JEQQGWPG7EAMJQAIQN3JGRCB32BWLEIQYZXMKGC54OGGIMV` | X Layer (xStock) | `0x6f9bb49f0f9b33a5dd14088a2fdff2a9bbf6f5a3` | 1:1 |
| **$SPY** | SPDR S&P 500 ETF | `CD7P742J2JEQQGWPG7EAMJQAIQN3JGRCB32BWLEIQYZXMKGC54OGGIMV` | BNB Chain (bStock) | `0x98f260340b3cb1c95116df14e8ee1c183bbd3257` | 1:1 |
| **$QQQ** | Invesco QQQ Trust | `CCLLM42J2JEQQGWPG7EAMJQAIQN3JGRCB32BWLEIQYZXMKGC54OGGIMV` | X Layer (xStock) | `0x3344ccbb00112233445566778899aabbccddeeff` | 1:1 |

---

## Backend Settlement: bStocks vs. X Layer (OKX xStocks)

Where are the stocks gotten from and which venue is easier to adapt?

* **bStocks (BNB Chain):** Real tokenized shares issued by regulated Swiss trustees (Backed Finance) with deep liquidity on PancakeSwap. High trading volume, but requires handling EVM gas and wallet-specific RPCs.
* **xStocks (X Layer - OKX):** Tokenized shares hosted on X Layer (Polygon CDK zkEVM) powered by OKX. **xStocks is easier to adapt programmatically** because OKX provides the unified **OKX Onchain OS API** with automated quoting, DEX routing, and sub-cent transaction costs.
* **ViApp's Solution:** ViApp implements an abstraction bridge router in [`packages/core/src/bridge.ts`](packages/core/src/bridge.ts) that aggregates liquidity across both venues while keeping **100% of the user experience native to Stellar**.
* **Strategic Roadmap:** Direct transition to **Natively Tokenized and Liquidated Stocks on the Stellar Blockchain**, removing cross-chain bridges and pegged tokens entirely. See the dedicated [Roadmap Specification](docs/ROADMAP.md).

---

## Direct Native Stellar Tokenization & Liquidation Roadmap (Beyond Pegged Assets)

While ViApp launches on Testnet using a 1:1 pegged synthetic asset architecture backed by verified custodial reserves (bStocks & xStocks), **our strategic roadmap moves beyond cross-chain pegging to directly tokenized and natively liquidated equities natively issued on the Stellar blockchain**.

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

## How It Works

1. **Choose & Buy:** The sender selects an equity (e.g. $25 of NVDA) and pays in XLM or USDC using their Stellar wallet (Freighter, Passkey, or Keypair).
2. **Soroban Vault Escrow:** ViApp generates a cryptographic one-time claim keypair, signs a key proof, and invokes `create_gift(...)` on the Soroban GiftVault contract. The pegged share is safely locked on-chain.
3. **Sealed Note & Link:** The sender can write a personal note sealed with client-side encryption. The secret claim key is encoded in the URL hash (`https://viapp.gift/g/stellar/{giftId}#{claimSecret}`) so it never touches a central server.
4. **Gasless Claim:** The friend opens the link, authenticates with Google or a Stellar passkey, and taps "Claim". The ViApp relayer pays the Stellar network fee and invokes `claim(...)` on Soroban. The tokenized share is transferred directly to the friend's Stellar account.
5. **Instant On-Chain Liquidation or Hold:** The recipient can hold their share to accrue value and earn on-chain dividends, send it to another friend, or **instantly liquidate** it for native Stellar USDC or XLM on the Stellar DEX (SDEX) or Soroban AMM pools with a single tap.
6. **Non-Custodial Refund:** If the friend does not claim the gift before the expiry window (1 to 90 days), the sender can call `refund(giftId)` to reclaim the escrowed tokens. The refund path is unpausable by design.

---

## Repository Structure

```
viapp/
├── .github/workflows/ci.yml       # Automated GitHub Actions CI for Rust & TypeScript
├── docs/
│   ├── ARCHITECTURE.md            # Detailed protocol specification & Mermaid diagrams
│   ├── GRANT_PROPOSAL.md          # Stellar Community Fund (SCF) Tier-2 Proposal ($60k)
│   └── ROADMAP.md                 # Native tokenization & direct on-chain liquidation roadmap
├── packages/
│   ├── contracts/stellar/         # Soroban smart contract (Rust + wasm32v1-none)
│   │   ├── src/lib.rs             # GiftVault contract implementation (12 exported functions)
│   │   ├── tests/test_vault.rs    # Rust Soroban integration tests (5 passing)
│   │   └── scripts/               # One-click Testnet deployment scripts (deploy-testnet.ps1 / .sh)
│   ├── core/                      # Protocol core library
│   │   ├── src/client/stellar.ts  # Soroban transaction envelope builders & deployed IDs
│   │   ├── src/sep1.ts            # SEP-0001 stellar.toml parser
│   │   ├── src/sep10.ts           # SEP-0010 Stellar WebAuth challenge builder & validator
│   │   ├── src/sep38.ts           # SEP-0038 Anchor RFQ Quotes API client
│   │   ├── src/stocks-stellar.ts  # Tokenized equities catalog & pricing logic
│   │   └── test/                  # 575+ TypeScript test cases & property-based fuzz tests
│   ├── web/                       # Next.js 16 Web Application with Stellar UI
│   └── agent/                     # ViApp CLI Agent
├── vercel.json                    # 1-Click Front-End production deployment configuration
└── package.json                   # Workspace configuration
```

---

## Verification & Testing

ViApp maintains rigorous automated test suites across both smart contracts and client SDKs:

### 1. Soroban Smart Contract Tests (Rust)
```bash
cd packages/contracts/stellar
cargo test
```
*Output: 5/5 integration tests passing (pause/unpause, initialize, create_gift, claim, refund).*

### 2. Soroban Release WASM Build
```bash
cd packages/contracts/stellar
stellar contract build
```
*Output: Builds optimized `viapp_gift_vault.wasm` (8,835 bytes) with profile `release`.*

### 3. Core & Protocol Tests (TypeScript & Vitest)
```bash
npm test
```
*Output: 575+ passing tests across all suites, including:*
- `packages/core/test/sep.test.ts` (SEP-1, SEP-10, SEP-38 verification)
- `packages/core/test/fuzz-stellar-claim.test.ts` (Property-based fuzzing of 100 randomized Ed25519 signatures and digests)
- `packages/core/test/stellar-client.test.ts` (Soroban host function operation builders)
- `packages/core/test/stocks-stellar.test.ts` (Tokenized equity price calculations)
- `packages/core/test/bridge.test.ts` (Behind-the-scenes settlement simulations)

---

## Deploying to Stellar Testnet

To deploy and initialize your own instance of the Gift Vault on Stellar Testnet:

```powershell
cd packages/contracts/stellar
.\scripts\deploy-testnet.ps1 -Identity my-stellar-admin -Network testnet
```

---

## License

MIT License.
