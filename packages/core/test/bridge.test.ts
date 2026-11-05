import { describe, expect, it } from "vitest";
import {
  calculatePeggedShares,
  executeBridgePurchase,
  getPeggedConfig,
  PEGGED_STOCK_MAP,
  verify1to1PegProof,
} from "../src/bridge.js";

describe("Backend Bridge & 1:1 Pegged Stock Engine", () => {
  it("maps Stellar stocks to 1:1 backing assets on BNB/OKX", () => {
    const nvda = getPeggedConfig("NVDA");
    expect(nvda.backingVenue).toBe("bnb");
    expect(nvda.backingSymbol).toBe("NVDAB");
    expect(nvda.pegRatio).toBe("1:1");

    const meta = getPeggedConfig("META");
    expect(meta.backingVenue).toBe("okx");
    expect(meta.backingSymbol).toBe("METAx");
    expect(meta.pegRatio).toBe("1:1");
  });

  it("calculates pegged share amounts with 7 decimal precision for Stellar", () => {
    const { shares, sharesBaseUnits } = calculatePeggedShares("NVDA", 10.0);
    expect(parseFloat(shares)).toBeGreaterThan(0);
    expect(sharesBaseUnits).toBeGreaterThan(0n);
  });

  it("executes bridge purchase flow: Stellar payment -> backing fulfillment -> Soroban vault lock", async () => {
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
    expect(result.backingDetails.executionTxHash).toContain("0x");
  });

  it("verifies 1:1 peg proof for given gift", () => {
    const proof = verify1to1PegProof("42", "AAPL");
    expect(proof.verified).toBe(true);
    expect(proof.pegRatio).toBe("1:1");
    expect(proof.reserveType).toBe("bStocks_Binance_Custody");
  });
});
