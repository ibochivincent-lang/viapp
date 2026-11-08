import { describe, expect, it } from "vitest";
import { handleQuote } from "../src/quote.js";
import { handleStocks } from "../src/stocks.js";

const VALID_STELLAR_WALLET = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

describe("Unified Quote and Stocks routing (Stellar & BNB)", () => {
  it("routes handleStocks to Stellar stocks when chain is stellar", async () => {
    const res = await handleStocks({
      client: null as any,
      vault: "0x0000000000000000000000000000000000000000",
      api: null as any,
      chain: "stellar",
      stellarPassphrase: TESTNET_PASSPHRASE,
    });

    expect(res.status).toBe(200);
    if (res.status === 200 && "stocks" in res.body) {
      expect(res.body.stocks.length).toBeGreaterThan(0);
      const apple = res.body.stocks.find((s) => s.symbol === "AAPL" || ("code" in s && s.code === "AAPL"));
      expect(apple).toBeDefined();
    }
  });

  it("routes handleQuote to Stellar when chain is stellar", async () => {
    const res = await handleQuote(
      {
        api: null as any,
        client: null as any,
        vault: "0x0000000000000000000000000000000000000000",
        stellarPassphrase: TESTNET_PASSPHRASE,
      },
      {
        chain: "stellar",
        stock: "TSLA",
        usdAmount: "25",
        wallet: VALID_STELLAR_WALLET,
      },
      { country: "GB", region: "ENG" },
    );

    expect(res.status).toBe(200);
    if (res.status === 200 && "body" in res && res.body.ok) {
      expect(res.body.chain).toBe("stellar");
      expect(res.body.expectedShares).toBeDefined();
    }
  });

  it("routes handleQuote to Stellar when stock is a pegged stock symbol (NVDAB or AAPLx) without chain parameter", async () => {
    const resB = await handleQuote(
      { stellarPassphrase: TESTNET_PASSPHRASE },
      {
        stock: "NVDAB",
        usdAmount: "30",
        wallet: VALID_STELLAR_WALLET,
      },
      {},
    );

    expect(resB.status).toBe(200);
    if (resB.status === 200 && "body" in resB && resB.body.ok) {
      expect(resB.body.chain).toBe("stellar");
      expect(resB.body.stock.code).toBe("NVDAB");
      expect(resB.body.stock.venue).toBe("bnb");
    }

    const resX = await handleQuote(
      { stellarPassphrase: TESTNET_PASSPHRASE },
      {
        stock: "AAPLx",
        usdAmount: "40",
        wallet: VALID_STELLAR_WALLET,
      },
      {},
    );

    expect(resX.status).toBe(200);
    if (resX.status === 200 && "body" in resX && resX.body.ok) {
      expect(resX.body.chain).toBe("stellar");
      expect(resX.body.stock.code).toBe("AAPLx");
      expect(resX.body.stock.venue).toBe("okx");
    }
  });
});

