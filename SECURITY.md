# Security Policy & Vulnerability Disclosure

At **ViApp**, security of user funds, Soroban contract integrity, and zero-knowledge claim key secrecy are our top priorities.

---

## 🛡 Supported Versions

We actively support and provide security patches for:

| Component | Target Network | Supported |
|---|---|:---:|
| `viapp_gift_vault` (Soroban) | Stellar Testnet / Mainnet | ✅ |
| `@viapp/core` (TypeScript SDK) | Latest `main` | ✅ |
| `@viapp/web` (Next.js Application) | Production Deployment | ✅ |

---

## 🔍 Reporting a Vulnerability

If you discover a security vulnerability in ViApp contracts or infrastructure:

1. **Do NOT report security vulnerabilities via public GitHub issues.**
2. Send an encrypted email to the maintainers: `ibochivincent.lang <290086463+ibochivincent-lang@users.noreply.github.com>`.
3. Include:
   - Detailed description of the potential vulnerability.
   - Proof of concept (reproduction script, Soroban test, or transaction trace).
   - Estimated impact and severity assessment.

---

## ⏳ Response SLA

- **Initial Acknowledgement:** Within **24 hours**.
- **Triage & Reproducibility Assessment:** Within **48 hours**.
- **Fix & Public Security Advisory:** Within **7 days** (coordinated disclosure).

---

## 💰 Community Security Bug Bounties

Valid, previously unknown security vulnerabilities qualify for community rewards according to severity:

| Severity | Scope | Bounty Tier |
|---|---|:---:|
| **Critical** | Direct theft of locked escrow funds, unauthorized claim key extraction, contract bricking | Up to **\$5,000** |
| **High** | Gas exhaustion DoS of relayer, fee-bump manipulation, unauthorized state alterations | Up to **\$2,000** |
| **Medium** | Reentrancy without fund loss, inaccurate price band slippage | Up to **\$750** |
| **Low** | Informational vulnerabilities, edge-case event omissions | Up to **\$250** |

---

## 📜 Safe Harbor

Security researchers acting in good faith to test ViApp without degrading user funds, denying service, or publishing exploits prior to remediation will be granted safe harbor and acknowledged in [`CONTRIBUTORS.md`](./CONTRIBUTORS.md).
