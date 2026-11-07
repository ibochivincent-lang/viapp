<p align="center"><img src="packages/web/public/v-mark.svg" alt="ViApp" width="64"></p>

# ViApp: Tokenized Equities & Gift Vault on Stellar

Send someone their first share of Apple, NVIDIA, or Tesla as a link. The recipient signs in with Google, email, or a Stellar passkey and owns a real share on Stellar with no pre-funded crypto, no wallet setup hurdles, and zero gas fees.

Everything on ViApp's user surface runs natively on **Stellar**: users pay in **XLM or USDC on Stellar**, gifts are locked in a **Soroban Smart Contract**, and tokenized equities are held and transferred as **1:1 pegged assets** on the Stellar network.

[Architecture Specification](docs/ARCHITECTURE.md) · [SCF Grant Proposal](docs/GRANT_PROPOSAL.md) · [CI Pipeline](.github/workflows/ci.yml)

---

## Live on Stellar Testnet

The core ViApp smart contract `viapp-gift-vault` is deployed, initialized, and verified on the Stellar Testnet:

| Resource | Value | Explorer / Verification Link |
|---|---|---|
| **Contract ID** | `CDEDHFJ7POEWDFFDRV74ZIWK4CSDKGEN4B4IQXUZHMKGVMJIVFODEV5M` | [Stellar Expert Explorer](https://stellar.expert/explorer/testnet/contract/CDEDHFJ7POEWDFFDRV74ZIWK4CSDKGEN4B4IQXUZHMKGVMJIVFODEV5M) |
| **WASM Hash** | `89cfaedb8f5c3933e47dbb6f5eed3f182a31ed972738f60ef61efbd6b2f85266` | [Stellar Lab Contract](https://lab.stellar.org/r/testnet/contract/CDEDHFJ7POEWDFFDRV74ZIWK4CSDKGEN4B4IQXUZHMKGVMJIVFODEV5M) |
| **Deploy Transaction** | `8675102f...4be5` | [View Deploy Tx](https://stellar.expert/explorer/testnet/tx/8675102f1054b1322c73c378ad28f42ad1ab094dfcea556c4266e62db48b4be5) |
| **Init Transaction** | `2593bb74...2010` | [View Init Tx](https://stellar.expert/explorer/testnet/tx/2593bb74aefcb81c78b2a7d8518cffe28cbb71a05655dc314280f69fb9b72010) |
| **Initial Listed Token** | Native XLM SAC (`CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`) | [View Asset Contract](https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC) |

---

## Supported Pegged Equities on Stellar

ViApp supports 9 major equities pegged 1:1 on Stellar. Behind the scenes, the settlement engine coordinates with institutional liquidity venues, while the user and recipient interact entirely with Stellar SAC tokens:

| Symbol | Company / Asset Name | Stellar Token Representation | Backing Status |
|:---:|---|:---:|:---:|
| **NVDA** | NVIDIA Corp | Stellar Pegged Share | 1:1 Pegged Escrow |
| **AAPL** | Apple Inc. | Stellar Pegged Share | 1:1 Pegged Escrow |
| **TSLA** | Tesla, Inc. | Stellar Pegged Share | 1:1 Pegged Escrow |
| **MSFT** | Microsoft Corp | Stellar Pegged Share | 1:1 Pegged Escrow |
| **AMZN** | Amazon.com Inc | Stellar Pegged Share | 1:1 Pegged Escrow |
| **GOOGL** | Alphabet Inc | Stellar Pegged Share | 1:1 Pegged Escrow |
| **META** | Meta Platforms | Stellar Pegged Share | 1:1 Pegged Escrow |
| **SPY** | SPDR S&P 500 ETF | Stellar Pegged Share | 1:1 Pegged Escrow |
| **QQQ** | Invesco QQQ Trust | Stellar Pegged Share | 1:1 Pegged Escrow |

---

## Stellar Ecosystem Proposals (SEPs) Compliance

ViApp is architected as native Stellar infrastructure adhering to standard SEPs:

1. **SEP-0001 (Stellar Info File):** Resolves `stellar.toml` metadata, currency issuance, and anchor API routes. Implemented in [`packages/core/src/sep1.ts`](packages/core/src/sep1.ts).
2. **SEP-0010 (Stellar Web Authentication):** Challenge transaction generation and signature verification for secure client-relayer authentication. Implemented in [`packages/core/src/sep10.ts`](packages/core/src/sep10.ts).
3. **SEP-0038 (Anchor RFQ Quotes API):** Standardized price discovery and firm quote requests for converting Stellar XLM/USDC into tokenized equities. Implemented in [`packages/core/src/sep38.ts`](packages/core/src/sep38.ts).
4. **SEP-0041 (Stellar Asset Contract):** Direct token escrow using standardized Soroban token contract interfaces (`transfer`, `balanceOf`, `allowance`).

---

## How It Works

1. **Choose & Buy:** The sender selects an equity (e.g. $25 of NVDA) and pays in XLM or USDC using their Stellar wallet (Freighter, Passkey, or Keypair).
2. **Soroban Vault Escrow:** ViApp generates a cryptographic one-time claim keypair, signs a key proof, and invokes `create_gift(...)` on the Soroban GiftVault contract. The pegged share is safely locked on-chain.
3. **Sealed Note & Link:** The sender can write a personal note sealed with client-side encryption. The secret claim key is encoded in the URL hash (`https://viapp.gift/g/stellar/{giftId}#{claimSecret}`) so it never touches a central server.
4. **Gasless Claim:** The friend opens the link, authenticates with Google or a Stellar passkey, and taps "Claim". The ViApp relayer pays the Stellar network fee and invokes `claim(...)` on Soroban. The tokenized share is transferred directly to the friend's Stellar account.
5. **Non-Custodial Refund:** If the friend does not claim the gift before the expiry window (1 to 90 days), the sender can call `refund(giftId)` to reclaim the escrowed tokens. The refund path is unpausable by design.

---

## Repository Structure

```
viapp/
├── .github/workflows/ci.yml       # Automated GitHub Actions CI for Rust & TypeScript
├── docs/
│   ├── ARCHITECTURE.md            # Detailed protocol specification & Mermaid diagrams
│   └── GRANT_PROPOSAL.md          # Stellar Community Fund (SCF) Tier-2 Proposal ($60k)
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
