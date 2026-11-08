import { describe, expect, it } from "vitest";
import { Account, Asset, Keypair } from "@stellar/stellar-sdk";
import {
  buildChangeTrustOp,
  buildSacTransferOp,
  buildSdexOrderTx,
  buildSdexPathPaymentStrictReceiveOp,
  calculateAmmDeposit,
  calculateAmmSwapInput,
  calculateAmmSwapOutput,
  calculatePriceImpact,
  fromBaseUnits,
  getSacContractId,
  getTradablePairs,
  simulateTrade,
  TESTNET_PASSPHRASE,
  toBaseUnits,
} from "../src/trade-stellar.js";
import {
  findStellarStock,
  getAllStellarCatalogAssets,
  STELLAR_TESTNET_ISSUER,
} from "../src/stocks-stellar.js";
import {
  getPeggedConfig,
  PEGGED_STOCK_MAP,
  XLAYER_XSTOCKS_ALLOWLIST,
} from "../src/bridge.js";

const DUMMY_PUBLIC_KEY = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const DUMMY_RECIPIENT = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

describe("ViApp Stellar Trading & Liquidity Pool Engine", () => {
  describe("Unit Conversion & Derivations", () => {
    it("converts decimal amounts to 7-decimal base units and back", () => {
      const units = toBaseUnits("12.3456789");
      expect(units).toBe(123456789n);
      expect(fromBaseUnits(units)).toBe("12.3456789");

      const whole = toBaseUnits("100");
      expect(whole).toBe(1000000000n);
      expect(fromBaseUnits(whole)).toBe("100.0");
    });

    it("derives deterministic Soroban SAC contract IDs for bStocks and xStocks", () => {
      const aaplbSac = getSacContractId("AAPLB", STELLAR_TESTNET_ISSUER, TESTNET_PASSPHRASE);
      expect(aaplbSac).toMatch(/^[A-Z0-9]{56}$/);

      const nvdaxSac = getSacContractId("NVDAx", STELLAR_TESTNET_ISSUER, TESTNET_PASSPHRASE);
      expect(nvdaxSac).toMatch(/^[A-Z0-9]{56}$/);

      // Different tickers produce distinct SAC contract IDs
      expect(aaplbSac).not.toBe(nvdaxSac);
    });
  });

  describe("Wallet Trustlines & SAC Operations", () => {
    it("builds ChangeTrust operation for Stellar wallets to hold tokenized stocks", () => {
      const op = buildChangeTrustOp("AAPLx", STELLAR_TESTNET_ISSUER);
      expect(op).toBeDefined();
      expect(op.body().switch().name).toBe("changeTrust");
    });

    it("builds Soroban SAC token transfer operation", () => {
      const sacId = getSacContractId("NVDAB", STELLAR_TESTNET_ISSUER, TESTNET_PASSPHRASE);
      const op = buildSacTransferOp({
        sacContractId: sacId,
        from: DUMMY_PUBLIC_KEY,
        to: DUMMY_RECIPIENT,
        amount: 50000000n, // 5 shares
      });
      expect(op).toBeDefined();
      expect(op.body().switch().name).toBe("invokeHostFunction");
    });
  });

  describe("SDEX Orderbook Trade Logic", () => {
    it("builds un-simulated Stellar transaction for SDEX buy order", () => {
      const sourceAccount = new Account(DUMMY_PUBLIC_KEY, "1000");
      const tx = buildSdexOrderTx({
        sourceAccount,
        stockCode: "AAPLB",
        counterAssetCode: "USDC",
        side: "buy",
        shares: "5.0",
        pricePerShare: "228.50",
      });

      expect(tx).toBeDefined();
      expect(tx.operations.length).toBe(1);
      expect(tx.operations[0]!.type).toBe("manageBuyOffer");
    });

    it("builds un-simulated Stellar transaction for SDEX sell order", () => {
      const sourceAccount = new Account(DUMMY_PUBLIC_KEY, "1001");
      const tx = buildSdexOrderTx({
        sourceAccount,
        stockCode: "NVDAx",
        counterAssetCode: "USDC",
        side: "sell",
        shares: "2.5",
        pricePerShare: "142.20",
      });

      expect(tx).toBeDefined();
      expect(tx.operations.length).toBe(1);
      expect(tx.operations[0]!.type).toBe("manageSellOffer");
    });

    it("builds path payment operation for instant SDEX execution", () => {
      const op = buildSdexPathPaymentStrictReceiveOp({
        sourceAsset: Asset.native(),
        maxSourceAmount: "500.0",
        destinationAccount: DUMMY_PUBLIC_KEY,
        destinationAsset: new Asset("TSLAx", STELLAR_TESTNET_ISSUER),
        destinationAmount: "1.0",
      });

      expect(op).toBeDefined();
      expect(op.body().switch().name).toBe("pathPaymentStrictReceive");
    });
  });

  describe("Constant-Product ($x \\cdot y = k$) AMM Liquidity Pools", () => {
    it("calculates exact swap output and fee for pool", () => {
      // 10,000 USDC in reserve, 50 stock in reserve, user swaps 200 USDC
      const reserveIn = 10000n * 10000000n;
      const reserveOut = 50n * 10000000n;
      const amountIn = 200n * 10000000n;

      const { amountOut, feeAmount } = calculateAmmSwapOutput(reserveIn, reserveOut, amountIn, 30);
      expect(amountOut).toBeGreaterThan(0n);
      expect(feeAmount).toBe((amountIn * 30n) / 10000n);

      // Invariant k must increase or stay equal due to fee
      const kBefore = reserveIn * reserveOut;
      const kAfter = (reserveIn + amountIn) * (reserveOut - amountOut);
      expect(kAfter).toBeGreaterThanOrEqual(kBefore);
    });

    it("calculates required input for exact target output", () => {
      const reserveIn = 10000n * 10000000n;
      const reserveOut = 50n * 10000000n;
      const targetOut = 1n * 10000000n; // 1 share

      const { amountIn } = calculateAmmSwapInput(reserveIn, reserveOut, targetOut, 30);
      expect(amountIn).toBeGreaterThan(0n);

      // Verifying round-trip with calculateAmmSwapOutput
      const { amountOut } = calculateAmmSwapOutput(reserveIn, reserveOut, amountIn, 30);
      expect(amountOut).toBeGreaterThanOrEqual(targetOut);
    });

    it("calculates price impact accurately", () => {
      const reserveIn = 100000n * 10000000n;
      const reserveOut = 500n * 10000000n;
      // Small trade has negligible price impact (< 0.5%)
      const smallIn = 100n * 10000000n;
      const { amountOut: smallOut } = calculateAmmSwapOutput(reserveIn, reserveOut, smallIn, 30);
      const smallImpact = calculatePriceImpact(reserveIn, reserveOut, smallIn, smallOut);
      expect(smallImpact).toBeLessThan(0.5);

      // Large trade has noticeable price impact (> 5%)
      const largeIn = 10000n * 10000000n;
      const { amountOut: largeOut } = calculateAmmSwapOutput(reserveIn, reserveOut, largeIn, 30);
      const largeImpact = calculatePriceImpact(reserveIn, reserveOut, largeIn, largeOut);
      expect(largeImpact).toBeGreaterThan(5.0);
    });

    it("calculates LP deposit proportional amounts", () => {
      const pool = {
        reserveStock: 100n * 10000000n,
        reserveCounter: 20000n * 10000000n,
        feeBps: 30,
        totalLpSupply: 1000n * 10000000n,
      };

      const { amountCounter, lpTokensMinted } = calculateAmmDeposit(pool, 10n * 10000000n); // 10 shares
      expect(amountCounter).toBe(2000n * 10000000n); // 2000 USDC needed
      expect(lpTokensMinted).toBe(100n * 10000000n); // 10% of total LP supply
    });
  });

  describe("End-to-End Trade Simulation for bStocks & xStocks", () => {
    it("simulates buying a bStock (AAPLB) with USDC on Stellar", () => {
      const result = simulateTrade({
        stockCode: "AAPLB",
        counterAssetCode: "USDC",
        side: "buy",
        amount: "50.0", // 50 USDC
        limitPrice: "228.50",
        userStellarAddress: DUMMY_PUBLIC_KEY,
        slippageBps: 50,
      });

      expect(result.ok).toBe(true);
      expect(result.stockCode).toBe("AAPLB");
      expect(result.side).toBe("buy");
      expect(parseFloat(result.expectedOutputAmount)).toBeGreaterThan(0);
      expect(parseFloat(result.minOutputAmount)).toBeLessThan(parseFloat(result.expectedOutputAmount));
      expect(result.sacContractId).toMatch(/^[A-Z0-9]{56}$/);
    });

    it("simulates selling an OKX xStock (NVDAx) for USDC on Stellar", () => {
      const result = simulateTrade({
        stockCode: "NVDAx",
        counterAssetCode: "USDC",
        side: "sell",
        amount: "1.0", // 1 share
        limitPrice: "142.20",
        userStellarAddress: DUMMY_PUBLIC_KEY,
        slippageBps: 50,
      });

      expect(result.ok).toBe(true);
      expect(result.stockCode).toBe("NVDAx");
      expect(result.side).toBe("sell");
      expect(parseFloat(result.expectedOutputAmount)).toBeGreaterThan(130.0);
      expect(result.sacContractId).toMatch(/^[A-Z0-9]{56}$/);
    });

    it("rejects simulation with zero or negative trade amount", () => {
      expect(() => {
        simulateTrade({
          stockCode: "AAPLB",
          counterAssetCode: "USDC",
          side: "buy",
          amount: "0",
          limitPrice: "228.50",
          userStellarAddress: DUMMY_PUBLIC_KEY,
        });
      }).toThrow(/greater than zero/);

      expect(() => {
        simulateTrade({
          stockCode: "NVDAx",
          counterAssetCode: "USDC",
          side: "sell",
          amount: "-5.0",
          limitPrice: "142.20",
          userStellarAddress: DUMMY_PUBLIC_KEY,
        });
      }).toThrow(/greater than zero/);
    });

    it("rejects simulation when trade amount is too small to yield output", () => {
      expect(() => {
        simulateTrade({
          stockCode: "AAPLB",
          counterAssetCode: "USDC",
          side: "buy",
          amount: "0.0000001", // 1 stroop of USDC
          limitPrice: "228.50",
          userStellarAddress: DUMMY_PUBLIC_KEY,
        });
      }).toThrow(/too small/);
    });

    it("clamps extreme slippage BPS gracefully", () => {
      const result = simulateTrade({
        stockCode: "AAPLB",
        counterAssetCode: "USDC",
        side: "buy",
        amount: "50.0",
        limitPrice: "228.50",
        userStellarAddress: DUMMY_PUBLIC_KEY,
        slippageBps: 20000, // > 10000 (100%)
      });
      expect(result.ok).toBe(true);
      expect(result.minOutputAmount).toBe("0.0");
    });

    it("rejects simulation of unlisted stock", () => {
      expect(() => {
        simulateTrade({
          stockCode: "UNKNOWN_TICKER",
          counterAssetCode: "USDC",
          side: "buy",
          amount: "10.0",
          limitPrice: "10.0",
          userStellarAddress: DUMMY_PUBLIC_KEY,
        });
      }).toThrow(/not listed on Stellar/);
    });
  });

  describe("Edge-Case Robustness: AMM Math & Boundary Conditions", () => {
    it("handles zero reserves and non-positive inputs safely in calculateAmmSwapOutput", () => {
      expect(calculateAmmSwapOutput(0n, 1000n, 10n)).toEqual({ amountOut: 0n, feeAmount: 0n });
      expect(calculateAmmSwapOutput(1000n, 0n, 10n)).toEqual({ amountOut: 0n, feeAmount: 0n });
      expect(calculateAmmSwapOutput(1000n, 1000n, 0n)).toEqual({ amountOut: 0n, feeAmount: 0n });
    });

    it("handles AMM deposit with 0 reserve stock without BigInt divide-by-zero", () => {
      const emptyStockPool = {
        reserveStock: 0n,
        reserveCounter: 1000000000n,
        feeBps: 30,
        totalLpSupply: 0n,
      };
      const res = calculateAmmDeposit(emptyStockPool, 10000000n);
      expect(res.amountCounter).toBe(10000000n);
      expect(res.lpTokensMinted).toBe(10000000n);
    });

    it("handles price impact when amounts or reserves are zero", () => {
      expect(calculatePriceImpact(0n, 1000n, 10n, 10n)).toBe(0);
      expect(calculatePriceImpact(1000n, 0n, 10n, 10n)).toBe(0);
      expect(calculatePriceImpact(1000n, 1000n, 0n, 10n)).toBe(0);
      expect(calculatePriceImpact(1000n, 1000n, 10n, 0n)).toBe(0);
    });
  });

  describe("Ticker Resolution & Cross-Chain Pegging Lookups", () => {
    it("resolves prefix notations, mixed case, and punctuation via findStellarStock", () => {
      // Mixed casing
      expect(findStellarStock("nvdaX", TESTNET_PASSPHRASE)?.code).toBe("NVDAx");
      expect(findStellarStock("aaplB", TESTNET_PASSPHRASE)?.code).toBe("AAPLB");
      // Prefix notation
      expect(findStellarStock("bNVDA", TESTNET_PASSPHRASE)?.code).toBe("NVDAB");
      expect(findStellarStock("xAAPL", TESTNET_PASSPHRASE)?.code).toBe("AAPLx");
      // Punctuation / separators
      expect(findStellarStock("AAPL-B", TESTNET_PASSPHRASE)?.code).toBe("AAPLB");
      expect(findStellarStock("NVDA_X", TESTNET_PASSPHRASE)?.code).toBe("NVDAx");
      expect(findStellarStock("TSLA/USDC", TESTNET_PASSPHRASE)?.code).toBe("TSLA");
      // Settlement currencies
      expect(findStellarStock("USDG", TESTNET_PASSPHRASE)?.code).toBe("USDG");
      expect(findStellarStock("USDC", TESTNET_PASSPHRASE)?.code).toBe("USDC");
    });

    it("resolves direct case-sensitive and contract address lookups in PEGGED_STOCK_MAP & getPeggedConfig", () => {
      // Direct access by stock.code with lowercase 'x'
      expect(PEGGED_STOCK_MAP["AAPLx"]).toBeDefined();
      expect(PEGGED_STOCK_MAP["AAPLx"]?.backingVenue).toBe("okx");

      // getPeggedConfig by contract address
      const xlayerAaplAddr = XLAYER_XSTOCKS_ALLOWLIST.AAPLx.address;
      const configByAddr = getPeggedConfig(xlayerAaplAddr);
      expect(configByAddr.code).toBe("AAPLx");
      expect(configByAddr.backingVenue).toBe("okx");

      // getPeggedConfig with prefix
      const prefixCfg = getPeggedConfig("bNVDA");
      expect(prefixCfg.code).toBe("NVDAB");
      expect(prefixCfg.backingVenue).toBe("bnb");
    });
  });

  describe("Tradable Pairs Directory", () => {
    it("returns pairs for all bStocks and xStocks on Stellar", () => {
      const pairs = getTradablePairs(TESTNET_PASSPHRASE);
      expect(pairs.length).toBeGreaterThanOrEqual(30);

      // Verify specific bStock and xStock pairs exist
      const aaplbPair = pairs.find((p) => p.pair === "AAPLB/USDC");
      expect(aaplbPair).toBeDefined();
      expect(aaplbPair?.venue).toBe("bnb");

      const nvdaxPair = pairs.find((p) => p.pair === "NVDAx/USDC");
      expect(nvdaxPair).toBeDefined();
      expect(nvdaxPair?.venue).toBe("okx");

      const tslaPair = pairs.find((p) => p.pair === "TSLA/XLM");
      expect(tslaPair).toBeDefined();
    });
  });
});
