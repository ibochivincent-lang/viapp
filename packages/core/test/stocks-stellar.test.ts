import { describe, expect, it } from "vitest";
import { findStellarStock, getStellarStocks, STELLAR_TESTNET_ISSUER } from "../src/stocks-stellar.js";
import { handleStellarQuote } from "../src/quote-stellar.js";

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const VALID_STELLAR_WALLET = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

describe("Stellar Stocks and Quotation", () => {
  it("lists Stellar stocks with valid SAC contract IDs", () => {
    const stocks = getStellarStocks(TESTNET_PASSPHRASE);
    expect(stocks.length).toBeGreaterThanOrEqual(9);

    const aapl = stocks.find((s) => s.code === "AAPL");
    expect(aapl).toBeDefined();
    expect(aapl?.name).toBe("Apple Inc.");
    expect(aapl?.decimals).toBe(7);
    expect(aapl?.contractId).toMatch(/^[A-Z0-9]{56}$/);
  });

  it("finds a stock by symbol case-insensitively", () => {
    const tsla = findStellarStock("tsla", TESTNET_PASSPHRASE);
    expect(tsla).toBeDefined();
    expect(tsla?.code).toBe("TSLA");
    expect(tsla?.name).toBe("Tesla, Inc.");
  });

  it("quotes a valid stock purchase on Stellar", () => {
    const response = handleStellarQuote({
      stock: "NVDA",
      usdAmount: "50",
      wallet: VALID_STELLAR_WALLET,
      networkPassphrase: TESTNET_PASSPHRASE,
      slippageBps: 100, // 1%
    });

    expect(response.status).toBe(200);
    if (response.status === 200 && response.body.ok) {
      expect(response.body.chain).toBe("stellar");
      expect(response.body.stock.code).toBe("NVDA");
      expect(response.body.usdAmount).toBe("50.00");
      expect(parseFloat(response.body.expectedShares)).toBeGreaterThan(0);
      expect(parseFloat(response.body.minShares)).toBeLessThan(parseFloat(response.body.expectedShares));
    }
  });

  it("rejects invalid Stellar wallet address", () => {
    const response = handleStellarQuote({
      stock: "AAPL",
      usdAmount: "25",
      wallet: "0x1234567890abcdef1234567890abcdef12345678", // EVM address passed instead of Stellar
      networkPassphrase: TESTNET_PASSPHRASE,
    });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ ok: false, error: "bad_wallet" });
  });

  it("rejects out of bounds amount", () => {
    const tooSmall = handleStellarQuote({
      stock: "AAPL",
      usdAmount: "0.50",
      wallet: VALID_STELLAR_WALLET,
      networkPassphrase: TESTNET_PASSPHRASE,
    });
    expect(tooSmall.status).toBe(400);
    expect(tooSmall.body).toEqual({ ok: false, error: "amount_too_small" });

    const tooLarge = handleStellarQuote({
      stock: "AAPL",
      usdAmount: "150.00",
      wallet: VALID_STELLAR_WALLET,
      networkPassphrase: TESTNET_PASSPHRASE,
    });
    expect(tooLarge.status).toBe(400);
    expect(tooLarge.body).toEqual({ ok: false, error: "amount_too_large" });
  });

  it("rejects unknown stock symbol", () => {
    const response = handleStellarQuote({
      stock: "NONEXISTENT",
      usdAmount: "25",
      wallet: VALID_STELLAR_WALLET,
      networkPassphrase: TESTNET_PASSPHRASE,
    });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ ok: false, error: "not_listed" });
  });
});

