import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  calculatePeggedShares,
  executeBridgePurchase,
  executeResilientBridgePurchase,
  getDualVenueBacking,
  getPeggedConfig,
  getVenueHealth,
  listDualVenueEquities,
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

  it("maps Stellar stocks to 1:1 backing assets on BNB/OKX", () => {
    const nvda = getPeggedConfig("NVDA");
    expect(nvda.backingVenue).toBe("bnb");
    expect(nvda.backingSymbol).toBe("NVDAB");
    expect(nvda.pegRatio).toBe("1:1");

    const meta = getPeggedConfig("META");
    expect(meta.backingVenue).toBe("okx");
    expect(meta.pegRatio).toBe("1:1");
  });

  it("calculates pegged share amounts with 7 decimal precision for Stellar", () => {
    const { shares, sharesBaseUnits } = calculatePeggedShares("NVDA", 10.0);
    expect(parseFloat(shares)).toBeGreaterThan(0);
    expect(sharesBaseUnits).toBeGreaterThan(0n);
  });

  it("executes standard primary bridge purchase when primary venue is healthy", async () => {
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
    expect(result.backingDetails.fallbackTriggered).toBe(false);
    expect(result.backingDetails.primaryAttempted).toBe("bnb");
    expect(result.backingDetails.executionTxHash).toContain("0x");
  });

  it("automatically fails over to OKX xStocks when bStocks (BNB) fails or is marked offline", async () => {
    // Simulate bStocks downtime or network failure on BSC
    setVenueHealth("bnb", false);
    expect(getVenueHealth("bnb")).toBe(false);
    expect(getVenueHealth("okx")).toBe(true);

    const result = await executeResilientBridgePurchase({
      senderStellarAddress: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      stockCode: "AAPL",
      paymentAsset: "USDC",
      usdAmount: 10.0,
      giftId: 101n,
      claimKeyHash: "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    });

    expect(result.ok).toBe(true);
    expect(result.stockCode).toBe("AAPL");
    // Verify automatic failover took effect
    expect(result.backingDetails.fallbackTriggered).toBe(true);
    expect(result.backingDetails.primaryAttempted).toBe("bnb");
    expect(result.backingDetails.venue).toBe("okx");
    expect(result.backingDetails.backingSymbol).toBe("AAPLx");
    expect(result.backingDetails.contract).toBe("0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a"); // OKX X Layer AAPLx
    expect(result.backingDetails.fallbackReason).toContain("Primary venue 'bnb' unavailable");
    expect(Buffer.from(result.backingDetails.executionTxHash.slice(2), "hex").toString("utf8")).toContain(":fallback");
  });

  it("automatically fails over to BNB bStocks when OKX xStocks fails or is marked offline", async () => {
    // Simulate OKX X Layer downtime or bridge pause
    setVenueHealth("okx", false);
    expect(getVenueHealth("okx")).toBe(false);
    expect(getVenueHealth("bnb")).toBe(true);

    const result = await executeResilientBridgePurchase({
      senderStellarAddress: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      stockCode: "NVDAx",
      paymentAsset: "USDC",
      usdAmount: 10.0,
      giftId: 102n,
      claimKeyHash: "fedcbafedcbafedcbafedcbafedcbafedcbafedcbafedcbafedcbafedcba1234",
    });

    expect(result.ok).toBe(true);
    expect(result.stockCode).toBe("NVDAx");
    // Verify automatic failover from OKX to BNB bStocks
    expect(result.backingDetails.fallbackTriggered).toBe(true);
    expect(result.backingDetails.primaryAttempted).toBe("okx");
    expect(result.backingDetails.venue).toBe("bnb");
    expect(result.backingDetails.backingSymbol).toBe("NVDAB");
    expect(result.backingDetails.contract).toBe("0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436"); // BSC NVDAB
    expect(result.backingDetails.fallbackReason).toContain("Primary venue 'okx' unavailable");
    expect(Buffer.from(result.backingDetails.executionTxHash.slice(2), "hex").toString("utf8")).toContain(":fallback");
  });

  it("automatically fails over using forceFailPrimary options flag", async () => {
    const result = await executeBridgePurchase(
      {
        senderStellarAddress: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        stockCode: "TSLA",
        paymentAsset: "XLM",
        usdAmount: 25.0,
        giftId: 202n,
        claimKeyHash: "1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
      },
      { forceFailPrimary: true, failoverReason: "Simulated BSC RPC timeout" }
    );

    expect(result.ok).toBe(true);
    expect(result.backingDetails.fallbackTriggered).toBe(true);
    expect(result.backingDetails.venue).toBe("okx");
    expect(result.backingDetails.backingSymbol).toBe("TSLAx");
    expect(result.backingDetails.contract).toBe("0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0"); // OKX TSLAx
    expect(result.backingDetails.fallbackReason).toBe("Simulated BSC RPC timeout");
  });

  it("throws clear error when BOTH primary and secondary backing venues are down", async () => {
    setVenueHealth("bnb", false);
    setVenueHealth("okx", false);

    await expect(
      executeResilientBridgePurchase({
        senderStellarAddress: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        stockCode: "MSFT",
        paymentAsset: "USDC",
        usdAmount: 15.0,
        giftId: 303n,
        claimKeyHash: "cafecafecafecafecafecafecafecafecafecafecafecafecafecafecafecafe",
      })
    ).rejects.toThrow("Multi-venue bridge failure: Both primary venue 'bnb' and fallback venue 'okx' are currently unavailable");
  });

  it("verifies dual-venue configuration exists for all 7 major equities", () => {
    const duals = listDualVenueEquities();
    expect(duals.length).toBeGreaterThanOrEqual(7);

    const codes = duals.map((d) => d.canonicalCode);
    expect(codes).toContain("AAPL");
    expect(codes).toContain("NVDA");
    expect(codes).toContain("TSLA");
    expect(codes).toContain("MSFT");
    expect(codes).toContain("AMZN");
    expect(codes).toContain("GOOGL");
    expect(codes).toContain("META");

    for (const dual of duals) {
      expect(dual.primaryVenue).toBe("bnb");
      expect(dual.fallbackVenue).toBe("okx");
      expect(dual.primaryContract).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(dual.fallbackContract).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(dual.pegRatio).toBe("1:1");
    }
  });

  it("resolves dual-venue backing config via getDualVenueBacking helper", () => {
    const goog = getDualVenueBacking("GOOGL");
    expect(goog).not.toBeNull();
    expect(goog?.primarySymbol).toBe("GOOGLB");
    expect(goog?.fallbackSymbol).toBe("GOOGLx");

    // Case and suffix normalization
    const googB = getDualVenueBacking("GOOGLB");
    expect(googB?.canonicalCode).toBe("GOOGL");
    const googX = getDualVenueBacking("GOOGLx");
    expect(googX?.canonicalCode).toBe("GOOGL");
  });

  it("verifies 1:1 peg proof for given gift and venue override", () => {
    const proofBnb = verify1to1PegProof("42", "AAPL");
    expect(proofBnb.verified).toBe(true);
    expect(proofBnb.pegRatio).toBe("1:1");
    expect(proofBnb.reserveType).toBe("bStocks_Binance_Custody");
    expect(proofBnb.activeVenue).toBe("bnb");

    const proofOkx = verify1to1PegProof("42", "AAPL", "okx");
    expect(proofOkx.verified).toBe(true);
    expect(proofOkx.activeVenue).toBe("okx");
    expect(proofOkx.reserveType).toBe("xStocks_OKX_Custody");
  });
});
