# Contributing to ViApp on Stellar

Thank you for your interest in contributing to **ViApp**, the tokenized equity gifting protocol on Stellar!

ViApp is an open-source public good designed to bring gasless gifting, instant micro-investing, and Soroban smart contract custody to everyone.

---

## 🛠 Project Structure

The project is structured as an npm workspaces monorepo:

* [`packages/contracts/stellar`](./packages/contracts/stellar): Soroban smart contracts written in Rust (`viapp-gift-vault`).
* [`packages/contracts/stellar/bindings`](./packages/contracts/stellar/bindings): Auto-generated TypeScript bindings for Soroban smart contracts (`@viapp/contracts`).
* [`packages/core`](./packages/core): Core protocol engine, SEP implementations (SEP-1, SEP-10, SEP-24, SEP-38), cryptography, and client SDK (`@viapp/core`).
* [`packages/web`](./packages/web): Next.js web application and interactive dApp interface (`@viapp/web`).

---

## 🚀 Development Setup

### Prerequisites

* **Node.js**: $\ge 22.0.0$
* **Rust**: $\ge 1.84.0$ with `wasm32v1-none` target (`rustup target add wasm32v1-none`)
* **Stellar CLI**: $\ge 22.0.0$ (`cargo install --locked stellar-cli`)

### Quickstart

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ibochivincent-lang/viapp.git
   cd viapp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run Soroban Rust tests:**
   ```bash
   cd packages/contracts/stellar
   cargo test
   ```

4. **Run TypeScript protocol tests:**
   ```bash
   cd ../../
   npm run test --workspace=@viapp/core
   ```

5. **Start local web application:**
   ```bash
   npm run dev --workspace=@viapp/web
   ```
   Open `http://localhost:3000` in your browser.

---

## 🧪 Testing Guidelines

* Every new feature or protocol change must be covered by automated tests.
* Smart contract updates require integration tests in `packages/contracts/stellar/tests/`.
* Protocol and client utilities must have unit and/or property-based fuzz tests in `packages/core/test/`.
* Run the full suite before submitting a PR:
  ```bash
  npm run test --workspaces
  ```

---

## 🏷 Issue Conventions & Contribution Ladder

We tag issues to help new contributors get started:

* `good-first-issue`: Clear scope, low barrier to entry, ideal for newcomers.
* `help-wanted`: Moderate complexity, well-defined architecture.
* `bounty`: Qualified for Stellar Community Fund (SCF) or ecosystem developer micro-grants.
* `soroban`: Rust smart contract tasks.
* `protocol`: SEP standard integrations and cryptographic primitives.

### Contributor Ladder

1. **Contributor**: Submits bug reports, documentation improvements, or fixes labeled `good-first-issue`.
2. **Reviewer**: Reviews PRs, provides feedback, and triages issues.
3. **Maintainer**: Has commit rights and guides protocol design decisions.

---

## 📜 Pull Request Process

1. Fork the repo and create your feature branch:
   ```bash
   git checkout -b feat/my-stellar-improvement
   ```
2. Commit your changes following conventional commits:
   `feat(core): add SEP-xx feature` or `fix(contracts): handle edge case in vault`.
3. Push to your branch and open a Pull Request against `main`.
4. Ensure all CI checks pass.

Thank you for building on Stellar with us!
