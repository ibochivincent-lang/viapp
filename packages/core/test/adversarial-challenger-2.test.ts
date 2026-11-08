import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import {
  STELLAR_STOCKS_CATALOG,
  getStellarStocks,
  findStellarStock,
  getAllStellarCatalogAssets,
  STELLAR_TESTNET_ISSUER,
} from "../src/stocks-stellar.js";
import {
  BSC_BSTOCKS_ALLOWLIST,
  PEGGED_STOCK_MAP,
  verify1to1PegProof,
  executeBridgePurchase,
  getPeggedConfig,
  setVenueHealth,
  calculatePeggedShares,
} from "../src/bridge.js";
import { handleStellarQuote } from "../src/quote-stellar.js";

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const EXPECTED_9_CORE_SYMBOLS = [
  "AAPL",
  "NVDA",
  "TSLA",
  "MSFT",
  "AMZN",
  "GOOGL",
  "META",
  "SPY",
  "QQQ",
] as const;

const FORMER_XLAYER_SYMBOLS = [
  "AAPLx",
  "MSFTx",
  "NVDAx",
  "GOOGLx",
  "AMZNx",
  "METAx",
  "TSLAx",
] as const;

const REPO_ROOT = path.resolve(__dirname, "../../..");

describe("Adversarial Challenger 2: Rigorous Empirical Stress Suite", () => {
  // =========================================================================
  // SECTION 1: StockPicker UI Contracts & In-Memory Filtering Adversarial Probes
  // =========================================================================
  describe("1. StockPicker UI Contracts & Filtering Stress", () => {
    const stockPickerPath = path.join(
      REPO_ROOT,
      "packages/web/components/send/StockPicker.tsx"
    );
    const sendCssPath = path.join(
      REPO_ROOT,
      "packages/web/components/send/send.css"
    );

    it("UI-ADV-01: StockPicker file exists and contains zero legacy tabs or OKX badges", () => {
      expect(fs.existsSync(stockPickerPath)).toBe(true);
      const code = fs.readFileSync(stockPickerPath, "utf-8");

      // Adversarial assertions: zero presence of tab filters, old categories, or okx styling
      expect(code).not.toContain("Equities (16)");
      expect(code).not.toContain("Direct Assets (9)");
      expect(code).not.toContain("send-venue-tabs");
      expect(code).not.toContain('role="tablist"');
      expect(code).not.toContain("send-badge-okx");
      expect(code).not.toContain("peggedCount");
      expect(code).not.toContain("directCount");
      expect(code).not.toContain("xStocks");
      expect(code).not.toContain("OKX");
    });

    it("UI-ADV-02: send.css contains zero OKX badge styles or tab active styles", () => {
      expect(fs.existsSync(sendCssPath)).toBe(true);
      const css = fs.readFileSync(sendCssPath, "utf-8");

      expect(css).not.toContain(".send-badge-okx");
      expect(css).not.toContain(".send-venue-tabs");
      expect(css).not.toContain(".send-venue-tab");
      expect(css).not.toContain(".send-venue-tab-active");
    });

    // In-memory search filtering logic identical to StockPicker.tsx
    const NAME_SUFFIXES = [
      " (bStocks)",
      " (bStock)",
      " Corporation",
      " Platforms Inc.",
      " Platforms",
      " Corp",
      " Inc.",
      " Inc",
    ];

    function displayName(name: string): string {
      let text = name.trim();
      let changed = true;
      while (changed) {
        changed = false;
        for (const suffix of NAME_SUFFIXES) {
          if (text.endsWith(suffix) && text.length > suffix.length) {
            text = text.slice(0, -suffix.length).trimEnd();
            changed = true;
          }
        }
        if (text.endsWith(",") && text.length > 1) {
          text = text.slice(0, -1).trimEnd();
          changed = true;
        }
      }
      return text;
    }

    const mockStocks = EXPECTED_9_CORE_SYMBOLS.map((sym) => {
      const stock = findStellarStock(sym, TESTNET_PASSPHRASE)!;
      return {
        address: stock.address,
        symbol: stock.code,
        name: stock.name,
        priceUsd: parseFloat(stock.priceUsd || "100"),
        market: { open: true, nextOpenTime: null },
        logoUrl: null,
        venue: stock.venue as "bnb" | "stellar",
      };
    });

    function filterStocks(searchQuery: string) {
      const q = searchQuery.trim().toLowerCase();
      return mockStocks.filter((stock) => {
        if (!q) return true;
        return (
          stock.symbol.toLowerCase().includes(q) ||
          stock.name.toLowerCase().includes(q) ||
          displayName(stock.name).toLowerCase().includes(q)
        );
      });
    }

    it("UI-ADV-03: Empty & whitespace queries return all 9 core stocks", () => {
      expect(filterStocks("").length).toBe(9);
      expect(filterStocks(" ").length).toBe(9);
      expect(filterStocks("   \t  \n  ").length).toBe(9);
    });

    it("UI-ADV-04: Leading/trailing whitespace and mixed case handle cleanly", () => {
      const q1 = filterStocks("   aApL   ");
      expect(q1.length).toBe(1);
      expect(q1[0].symbol).toBe("AAPL");

      const q2 = filterStocks("\tNvDa\n");
      expect(q2.length).toBe(1);
      expect(q2[0].symbol).toBe("NVDA");
    });

    it("UI-ADV-05: Partial company names and stripped legal names match correctly", () => {
      // "Tesla" from "Tesla, Inc."
      const tsla = filterStocks("Tesla");
      expect(tsla.length).toBe(1);
      expect(tsla[0].symbol).toBe("TSLA");

      // "Micro" from "Microsoft Corp"
      const msft = filterStocks("Micro");
      expect(msft.length).toBe(1);
      expect(msft[0].symbol).toBe("MSFT");

      // "Alphabet" or "Google" from "Alphabet Inc."
      const googl = filterStocks("Alphabet");
      expect(googl.length).toBe(1);
      expect(googl[0].symbol).toBe("GOOGL");

      // "Meta Platforms" -> "Meta"
      const meta = filterStocks("Meta");
      expect(meta.length).toBe(1);
      expect(meta[0].symbol).toBe("META");
    });

    it("UI-ADV-06: Adversarial queries (regex special chars, scripts, unicode) do not throw", () => {
      const adversarialInputs = [
        ".*",
        "[a-z]+",
        "(AAPL|NVDA)",
        "\\",
        "^$",
        "?+*",
        "<script>alert('xss')</script>",
        "'; DROP TABLE stocks; --",
        "🚀💎",
        "Аpple", // Cyrillic homoglyph
        "A".repeat(5000), // Stress length
      ];

      for (const input of adversarialInputs) {
        expect(() => filterStocks(input)).not.toThrow();
        const res = filterStocks(input);
        expect(Array.isArray(res)).toBe(true);
      }
    });

    it("UI-ADV-07: In-memory filter handles non-matching tickers without crashing", () => {
      const nonMatching = ["BTC", "DOGE", "XYZ123", "NONEXISTENT", "12345"];
      for (const q of nonMatching) {
        const res = filterStocks(q);
        expect(res.length).toBe(0);
      }
    });
  });

  // =========================================================================
  // SECTION 2: Boundary Amount Calculations & Math Invariants
  // =========================================================================
  describe("2. Boundary Amount Calculations & Precision Invariants", () => {
    it("BOUND-ADV-01: Zero, negative, and sub-cent amounts are strictly rejected with bad_amount", () => {
      const invalidAmounts = [
        "0",
        "0.0",
        "0.00",
        "-0",
        "-0.00",
        "-1",
        "-0.01",
        "-50.00",
        "-999999",
      ];

      for (const amt of invalidAmounts) {
        const res = handleStellarQuote({
          stock: "AAPL",
          usdAmount: amt,
          wallet: STELLAR_TESTNET_ISSUER,
          networkPassphrase: TESTNET_PASSPHRASE,
        });
        expect(res.status).toBe(400);
        expect(res.body.ok).toBe(false);
        if (!res.body.ok) {
          expect(res.body.error).toBe("bad_amount");
        }
      }
    });

    it("BOUND-ADV-02: Non-numeric, NaN, Infinity, and empty strings are rejected with bad_amount or amount_too_large", () => {
      const malformedAmounts = [
        "NaN",
        "abc",
        "",
        "   ",
        "null",
        "undefined",
        "$50",
      ];

      for (const amt of malformedAmounts) {
        const res = handleStellarQuote({
          stock: "NVDA",
          usdAmount: amt,
          wallet: STELLAR_TESTNET_ISSUER,
          networkPassphrase: TESTNET_PASSPHRASE,
        });
        expect(res.status).toBe(400);
        expect(res.body.ok).toBe(false);
        if (!res.body.ok) {
          expect(res.body.error).toBe("bad_amount");
        }
      }

      // Infinity exceeds MAX_USD ($100.00)
      const infRes = handleStellarQuote({
        stock: "NVDA",
        usdAmount: "Infinity",
        wallet: STELLAR_TESTNET_ISSUER,
        networkPassphrase: TESTNET_PASSPHRASE,
      });
      expect(infRes.status).toBe(400);
      expect((infRes.body as any).error).toBe("amount_too_large");

      // -Infinity is <= 0
      const negInfRes = handleStellarQuote({
        stock: "NVDA",
        usdAmount: "-Infinity",
        wallet: STELLAR_TESTNET_ISSUER,
        networkPassphrase: TESTNET_PASSPHRASE,
      });
      expect(negInfRes.status).toBe(400);
      expect((negInfRes.body as any).error).toBe("bad_amount");
    });

    it("BOUND-ADV-03: Strict boundaries around MIN_USD ($1.00) and MAX_USD ($100.00)", () => {
      // Below min: $0.9999999
      const belowMin = handleStellarQuote({
        stock: "TSLA",
        usdAmount: "0.9999999",
        wallet: STELLAR_TESTNET_ISSUER,
        networkPassphrase: TESTNET_PASSPHRASE,
      });
      expect(belowMin.status).toBe(400);
      expect((belowMin.body as any).error).toBe("amount_too_small");

      // Exact min: $1.0000000
      const exactMin = handleStellarQuote({
        stock: "TSLA",
        usdAmount: "1.0000000",
        wallet: STELLAR_TESTNET_ISSUER,
        networkPassphrase: TESTNET_PASSPHRASE,
      });
      expect(exactMin.status).toBe(200);
      expect(exactMin.body.ok).toBe(true);

      // Exact max: $100.0000000
      const exactMax = handleStellarQuote({
        stock: "TSLA",
        usdAmount: "100.0000000",
        wallet: STELLAR_TESTNET_ISSUER,
        networkPassphrase: TESTNET_PASSPHRASE,
      });
      expect(exactMax.status).toBe(200);
      expect(exactMax.body.ok).toBe(true);

      // Above max: $100.0000001
      const aboveMax = handleStellarQuote({
        stock: "TSLA",
        usdAmount: "100.0000001",
        wallet: STELLAR_TESTNET_ISSUER,
        networkPassphrase: TESTNET_PASSPHRASE,
      });
      expect(aboveMax.status).toBe(400);
      expect((aboveMax.body as any).error).toBe("amount_too_large");

      // Far above max: $1,000,000
      const extremeMax = handleStellarQuote({
        stock: "TSLA",
        usdAmount: "1000000",
        wallet: STELLAR_TESTNET_ISSUER,
        networkPassphrase: TESTNET_PASSPHRASE,
      });
      expect(extremeMax.status).toBe(400);
      expect((extremeMax.body as any).error).toBe("amount_too_large");
    });

    it("BOUND-ADV-04: High-precision calculations and Stellar 7-decimal formatting", () => {
      const precisionAmounts = [
        "1.1234567",
        "7.9999999",
        "33.3333333",
        "50.0000001",
        "99.9999999",
      ];

      for (const amt of precisionAmounts) {
        for (const stock of EXPECTED_9_CORE_SYMBOLS) {
          const res = handleStellarQuote({
            stock,
            usdAmount: amt,
            wallet: STELLAR_TESTNET_ISSUER,
            networkPassphrase: TESTNET_PASSPHRASE,
          });
          expect(res.status).toBe(200);
          expect(res.body.ok).toBe(true);
          if (res.body.ok) {
            // Verify 7 decimals format
            expect(res.body.expectedShares).toMatch(/^\d+\.\d{7}$/);
            expect(res.body.minShares).toMatch(/^\d+\.\d{7}$/);

            const exp = parseFloat(res.body.expectedShares);
            const min = parseFloat(res.body.minShares);
            expect(min).toBeLessThanOrEqual(exp);
            // Default 1% slippage
            expect(min / exp).toBeCloseTo(0.99, 4);
          }
        }
      }
    });

    it("BOUND-ADV-05: calculatePeggedShares handles micro and macro amounts without precision loss", () => {
      for (const stock of EXPECTED_9_CORE_SYMBOLS) {
        const { shares, sharesBaseUnits } = calculatePeggedShares(stock, 50.0);
        expect(shares).toMatch(/^\d+\.\d{7}$/);
        expect(typeof sharesBaseUnits).toBe("bigint");
        expect(sharesBaseUnits).toBeGreaterThan(0n);

        // Verify base unit alignment: baseUnits corresponds to floor(rawShares * 10^7)
        const cfg = STELLAR_STOCKS_CATALOG.find((s) => s.code === stock)!;
        const price = parseFloat(cfg.priceUsd!);
        const rawExpectedBaseUnits = BigInt(Math.floor((50.0 / price) * 10_000_000));
        expect(sharesBaseUnits).toBe(rawExpectedBaseUnits);
      }
    });

    it("BOUND-ADV-06: Slippage parameter customization stress test", () => {
      // 0 bps slippage (minShares == expectedShares)
      const res0 = handleStellarQuote({
        stock: "AAPL",
        usdAmount: "50.00",
        wallet: STELLAR_TESTNET_ISSUER,
        networkPassphrase: TESTNET_PASSPHRASE,
        slippageBps: 0,
      });
      expect(res0.status).toBe(200);
      if (res0.body.ok) {
        expect(res0.body.minShares).toBe(res0.body.expectedShares);
      }

      // 500 bps slippage (5% tolerance)
      const res500 = handleStellarQuote({
        stock: "AAPL",
        usdAmount: "50.00",
        wallet: STELLAR_TESTNET_ISSUER,
        networkPassphrase: TESTNET_PASSPHRASE,
        slippageBps: 500,
      });
      expect(res500.status).toBe(200);
      if (res500.body.ok) {
        const exp = parseFloat(res500.body.expectedShares);
        const min = parseFloat(res500.body.minShares);
        expect(min / exp).toBeCloseTo(0.95, 4);
      }
    });
  });

  // =========================================================================
  // SECTION 3: Bridge Routing & Failover Invariants
  // =========================================================================
  describe("3. Bridge Routing & 1:1 Peg Invariants", () => {
    it("ROUT-ADV-01: META backing is strictly BSC METAB at 0x7425889FE94F9d693E8daefE88BCCed6AcFEf4c0", () => {
      const metaConfig = getPeggedConfig("META");
      expect(metaConfig.backingVenue).toBe("bnb");
      expect(metaConfig.backingSymbol).toBe("METAB");
      expect(metaConfig.backingContract).toBe(
        "0x7425889FE94F9d693E8daefE88BCCed6AcFEf4c0"
      );
      expect(BSC_BSTOCKS_ALLOWLIST.METAB.address).toBe(
        "0x7425889FE94F9d693E8daefE88BCCed6AcFEf4c0"
      );
    });

    it("ROUT-ADV-02: All 9 core stocks quote and purchase exclusively via BSC bStocks", async () => {
      for (const stock of EXPECTED_9_CORE_SYMBOLS) {
        const result = await executeBridgePurchase({
          giftId: BigInt(2001),
          stockCode: stock,
          usdAmount: 50,
          paymentAsset: "USDC",
          senderStellarAddress: STELLAR_TESTNET_ISSUER,
          claimKeyHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        });

        expect(result.ok).toBe(true);
        expect(result.backingDetails.venue).toBe("bnb");
        expect(result.backingDetails.primaryAttempted).toBe("bnb");
        expect(result.backingDetails.fallbackTriggered).toBe(false);
        expect(result.backingDetails.pegRatio).toBe("1:1");
      }
    });

    it("ROUT-ADV-03: 1:1 peg proof strictly certifies bStocks_Binance_Custody for all 9 stocks", () => {
      for (const stock of EXPECTED_9_CORE_SYMBOLS) {
        const proof = verify1to1PegProof(`gift-adv-${stock}`, stock);
        expect(proof.verified).toBe(true);
        expect(proof.pegRatio).toBe("1:1");
        expect(proof.activeVenue).toBe("bnb");
        expect(proof.reserveType).toBe("bStocks_Binance_Custody");
      }
    });

    it("ROUT-ADV-04: Bridge outage aborts cleanly without failing over to OKX or Chain 196", async () => {
      setVenueHealth("bnb", false);
      try {
        await expect(
          executeBridgePurchase({
            giftId: BigInt(9999),
            stockCode: "AAPL",
            usdAmount: 50,
            paymentAsset: "USDC",
            senderStellarAddress: STELLAR_TESTNET_ISSUER,
            claimKeyHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          })
        ).rejects.toThrow(/unavailable|Bridge failure/);
      } finally {
        setVenueHealth("bnb", true);
      }
    });

    it("ROUT-ADV-05: Former xStocks and USDG are rejected or normalized without OKX venue", () => {
      for (const xSymbol of FORMER_XLAYER_SYMBOLS) {
        const resolved = findStellarStock(xSymbol, TESTNET_PASSPHRASE);
        if (resolved) {
          expect(resolved.venue).not.toBe("okx");
          expect(resolved.venue).toBe("bnb");
        } else {
          expect(resolved).toBeUndefined();
        }
      }

      const usdgQuote = handleStellarQuote({
        stock: "USDG",
        usdAmount: "50.00",
        wallet: STELLAR_TESTNET_ISSUER,
        networkPassphrase: TESTNET_PASSPHRASE,
      });
      expect(usdgQuote.status).toBe(400);
      expect((usdgQuote.body as any).error).toBe("not_listed");
    });
  });

  // =========================================================================
  // SECTION 4: Repository-Wide Zero-Trace & CI Invariants
  // =========================================================================
  describe("4. Zero-Trace & CI Invariants", () => {
    it("CI-ADV-01: Git author name and email strictly match specification", () => {
      let name = "";
      try {
        name = execSync("git config user.name", { cwd: REPO_ROOT, encoding: "utf-8" }).trim();
      } catch {
        name = execSync("git log -1 --pretty=format:%an", { cwd: REPO_ROOT, encoding: "utf-8" }).trim();
      }
      let email = "";
      try {
        email = execSync("git config user.email", { cwd: REPO_ROOT, encoding: "utf-8" }).trim();
      } catch {
        email = execSync("git log -1 --pretty=format:%ae", { cwd: REPO_ROOT, encoding: "utf-8" }).trim();
      }

      expect(name).toBe("ibochivincent.lang");
      expect(email).toBe("290086463+ibochivincent-lang@users.noreply.github.com");
    });

    it("CI-ADV-02: Git branch is main", () => {
      const branch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: REPO_ROOT,
        encoding: "utf-8",
      }).trim();
      expect(["main", "HEAD"]).toContain(branch);
    });

    it("CI-ADV-03: Zero references to Chain 196 or OKX in docs, contracts, or active code", () => {
      const targets = [
        "README.md",
        "docs/ARCHITECTURE.md",
        "packages/contracts/stellar/tests/test_vault.rs",
      ];
      for (const rel of targets) {
        const full = path.join(REPO_ROOT, rel);
        if (fs.existsSync(full)) {
          const content = fs.readFileSync(full, "utf-8");
          expect(content).not.toContain("Chain 196");
          expect(content).not.toContain("chain 196");
          expect(content).not.toContain("OKX Onchain OS");
          expect(content).not.toContain("Meirei");
        }
      }
    });

    it("CI-ADV-04: Soroban contract suite passes cargo test with 0 failures", () => {
      const output = execSync(
        "cargo test --manifest-path packages/contracts/stellar/Cargo.toml",
        {
          cwd: REPO_ROOT,
          encoding: "utf-8",
        }
      );
      expect(output).toContain("test result: ok");
      expect(output).not.toContain("FAILED");
    }, 60000);
  });
});
