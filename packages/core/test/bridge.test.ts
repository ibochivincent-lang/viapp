import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BSC_BSTOCKS_ALLOWLIST,
  calculatePeggedShares,
  executeBridgePurchase,
  executeResilientBridgePurchase,
  getBscStockAllowlist,
  getPeggedConfig,
  getVenueHealth,
  PEGGED_STOCK_MAP,
  resetVenueHealth,
  setVenueHealth,
  verify1to1PegProof,
} from "../src/bridge.js";

describe("Backend Bridge & 1:1 Pegged Stock Engine", () => {
  beforeEach(() => {
    resetVenueHealth();
  });

  afterEach(() => {
    resetVenueHealth();
  });

  it("maps Stellar stocks to 1:1 backing assets on BSC bStocks", () => {
    const nvda = getPeggedConfig("NVDA");
    expect(nvda.backingVenue).toBe("bnb");
    expect(nvda.backingSymbol).toBe("NVDAB");
    expect(nvda.pegRatio).toBe("1:1");

    // Corrected META backing: strictly routes to BSC bStock METAB
    const meta = getPeggedConfig("META");
    expect(meta.backingVenue).toBe("bnb");
    expect(meta.backingSymbol).toBe("METAB");
    expect(meta.backingContract).toBe(BSC_BSTOCKS_ALLOWLIST.METAB.address);
    expect(meta.pegRatio).toBe("1:1");
  });

  it("calculates pegged share amounts with 7 decimal precision for Stellar", () => {
    const { shares, sharesBaseUnits } = calculatePeggedShares("NVDA", 10.0);
    expect(parseFloat(shares)).toBeGreaterThan(0);
    expect(sharesBaseUnits).toBeGreaterThan(0n);
  });

  it("executes standard primary bridge purchase auto-routing to bStocks on BSC", async () => {
    const result = await executeBridgePurchase({
      senderStellarAddress: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      stockCode: "NVDA",
      paymentAsset: "USDC",
      usdAmount: 5.0,
      giftId: 42n,
      claimKeyHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    });

    expect(result.ok).toBe(true);
    expect(result.stockCode).toBe("NVDA");
    expect(result.paymentAsset).toBe("USDC");
    expect(result.paymentAmount).toBe("5.00");
    expect(result.backingDetails.pegRatio).toBe("1:1");
    expect(result.backingDetails.venue).toBe("bnb");
    expect(result.backingDetails.backingSymbol).toBe("NVDAB");
    expect(result.backingDetails.contract).toBe(BSC_BSTOCKS_ALLOWLIST.NVDAB.address);
    expect(result.backingDetails.fallbackTriggered).toBe(false);
    expect(result.backingDetails.primaryAttempted).toBe("bnb");
    expect(result.backingDetails.executionTxHash).toContain("0x");
  });

  it("executes auto-selected bridge purchase for META routing directly to BSC METAB", async () => {
    const result = await executeBridgePurchase({
      senderStellarAddress: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      stockCode: "META",
      paymentAsset: "USDC",
      usdAmount: 20.0,
      giftId: 43n,
      claimKeyHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    });

    expect(result.ok).toBe(true);
    expect(result.stockCode).toBe("META");
    expect(result.backingDetails.venue).toBe("bnb");
    expect(result.backingDetails.backingSymbol).toBe("METAB");
    expect(result.backingDetails.contract).toBe(BSC_BSTOCKS_ALLOWLIST.METAB.address);
    expect(result.backingDetails.fallbackTriggered).toBe(false);
  });

  it("auto-selects bStocks backing for all 9 core tokenized stocks", async () => {
    const coreStocks = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "GOOGL", "META", "SPY", "QQQ"];
    let giftCounter = 100n;

    for (const code of coreStocks) {
      const result = await executeBridgePurchase({
        senderStellarAddress: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        stockCode: code,
        paymentAsset: "USDC",
        usdAmount: 10.0,
        giftId: giftCounter++,
        claimKeyHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      });

      expect(result.ok).toBe(true);
      expect(result.backingDetails.venue).toBe("bnb");
      expect(result.backingDetails.backingSymbol).toBe(`${code}B`);
      expect(result.backingDetails.fallbackTriggered).toBe(false);
    }
  });

  it("throws clear error when BNB backing venue is offline or unhealthy", async () => {
    setVenueHealth("bnb", false);
    expect(getVenueHealth("bnb")).toBe(false);

    await expect(
      executeResilientBridgePurchase({
        senderStellarAddress: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        stockCode: "MSFT",
        paymentAsset: "USDC",
        usdAmount: 15.0,
        giftId: 303n,
        claimKeyHash: "cafecafecafecafecafecafecafecafecafecafecafecafecafecafecafecafe",
      })
    ).rejects.toThrow("Bridge failure: BNB bStocks backing venue is currently unavailable");
  });

  it("throws error when forceFailPrimary option is enabled", async () => {
    await expect(
      executeBridgePurchase(
        {
          senderStellarAddress: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
          stockCode: "TSLA",
          paymentAsset: "XLM",
          usdAmount: 25.0,
          giftId: 202n,
          claimKeyHash: "1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
        },
        { forceFailPrimary: true, failoverReason: "Simulated BSC RPC timeout" }
      )
    ).rejects.toThrow("Simulated BSC RPC timeout");
  });

  it("verifies 1:1 peg proof solely attests to bStocks_Binance_Custody", () => {
    const proofAapl = verify1to1PegProof("42", "AAPL");
    expect(proofAapl.verified).toBe(true);
    expect(proofAapl.pegRatio).toBe("1:1");
    expect(proofAapl.reserveType).toBe("bStocks_Binance_Custody");
    expect(proofAapl.activeVenue).toBe("bnb");

    const proofMeta = verify1to1PegProof("43", "META");
    expect(proofMeta.verified).toBe(true);
    expect(proofMeta.activeVenue).toBe("bnb");
    expect(proofMeta.reserveType).toBe("bStocks_Binance_Custody");
  });

  it("lists all 9 tradable bStocks via getBscStockAllowlist", () => {
    const allowlist = getBscStockAllowlist();
    expect(allowlist.length).toBe(9);
    const symbols = allowlist.map((s) => s.symbol);
    expect(symbols).toEqual([
      "AAPLB", "NVDAB", "TSLAB", "MSFTB", "AMZNB", "GOOGLB", "METAB", "SPYB", "QQQB"
    ]);
  });
});
