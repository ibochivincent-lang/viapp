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

  it("quotes pegged stocks on Stellar (bStocks and xStocks)", () => {
    // bStock pegged equity quote
    const bnvda = handleStellarQuote({
      stock: "NVDAB",
      usdAmount: "30",
      wallet: VALID_STELLAR_WALLET,
      networkPassphrase: TESTNET_PASSPHRASE,
      slippageBps: 50,
    });
    expect(bnvda.status).toBe(200);
    if (bnvda.status === 200 && bnvda.body.ok) {
      expect(bnvda.body.chain).toBe("stellar");
      expect(bnvda.body.stock.code).toBe("NVDAB");
      expect(parseFloat(bnvda.body.expectedShares)).toBeGreaterThan(0);
      expect(parseFloat(bnvda.body.minShares)).toBeLessThan(parseFloat(bnvda.body.expectedShares));
    }

    // xStock pegged equity quote
    const xaapl = handleStellarQuote({
      stock: "AAPLx",
      usdAmount: "50",
      wallet: VALID_STELLAR_WALLET,
      networkPassphrase: TESTNET_PASSPHRASE,
      slippageBps: 50,
    });
    expect(xaapl.status).toBe(200);
    if (xaapl.status === 200 && xaapl.body.ok) {
      expect(xaapl.body.chain).toBe("stellar");
      expect(xaapl.body.stock.code).toBe("AAPLx");
      expect(parseFloat(xaapl.body.expectedShares)).toBeGreaterThan(0);
    }
  });

  it("finds pegged stocks by contract ID or code", () => {
    const nvdab = findStellarStock("NVDAB", TESTNET_PASSPHRASE);
    expect(nvdab).toBeDefined();
    expect(nvdab?.venue).toBe("bnb");
    expect(nvdab?.contractId).toMatch(/^[A-Z0-9]{56}$/);

    const tslaX = findStellarStock("TSLAx", TESTNET_PASSPHRASE);
    expect(tslaX).toBeDefined();
    expect(tslaX?.venue).toBe("okx");
    expect(tslaX?.contractId).toMatch(/^[A-Z0-9]{56}$/);
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

