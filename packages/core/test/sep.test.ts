import { describe, expect, it, vi } from "vitest";
import { Keypair, Networks, Transaction } from "@stellar/stellar-sdk";
import { findTomlCurrency, parseStellarTomlText } from "../src/sep1.js";
import { buildSep10Challenge, verifySep10Challenge } from "../src/sep10.js";
import { Sep38Client } from "../src/sep38.js";

describe("SEP-0001: Stellar Info File (stellar.toml)", () => {
  const sampleToml = `
# ViApp Stellar configuration
VERSION="2.0.0"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
FEDERATION_SERVER="https://api.viapp.gift/federation"
AUTH_SERVER="https://api.viapp.gift/auth"
TRANSFER_SERVER_0024="https://api.viapp.gift/sep24"
ANCHOR_QUOTE_SERVER="https://api.viapp.gift/sep38"
SIGNING_KEY="GAZWESWQPZOIH2EH3IL37THBLKGLAC5FCHTLMWAXJGLKJPT4NRRIHN6B"

[[CURRENCIES]]
code="USDC"
issuer="GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
display_decimals=7
name="USD Coin"
desc="USDC pegged 1:1 with USD"

[[CURRENCIES]]
code="NVDA"
issuer="GAZWESWQPZOIH2EH3IL37THBLKGLAC5FCHTLMWAXJGLKJPT4NRRIHN6B"
display_decimals=7
name="NVIDIA Corp Tokenized Equity"
desc="Pegged 1:1 tokenized equity share"
`;

  it("parses stellar.toml fields and arrays into structured data", () => {
    const parsed = parseStellarTomlText(sampleToml);
    expect(parsed.VERSION).toBe("2.0.0");
    expect(parsed.NETWORK_PASSPHRASE).toBe("Test SDF Network ; September 2015");
    expect(parsed.ANCHOR_QUOTE_SERVER).toBe("https://api.viapp.gift/sep38");
    expect(parsed.SIGNING_KEY).toBe("GAZWESWQPZOIH2EH3IL37THBLKGLAC5FCHTLMWAXJGLKJPT4NRRIHN6B");
    expect(parsed.CURRENCIES?.length).toBe(2);
    expect(parsed.CURRENCIES?.[0].code).toBe("USDC");
    expect(parsed.CURRENCIES?.[1].code).toBe("NVDA");
  });

  it("finds specific currencies with findTomlCurrency", () => {
    const parsed = parseStellarTomlText(sampleToml);
    const usdc = findTomlCurrency(parsed, "USDC");
    expect(usdc).toBeDefined();
    expect(usdc?.name).toBe("USD Coin");

    const missing = findTomlCurrency(parsed, "XYZ");
    expect(missing).toBeUndefined();
  });
});

describe("SEP-0010: Stellar Web Authentication", () => {
  const serverKeypair = Keypair.random();
  const clientKeypair = Keypair.random();
  const networkPassphrase = Networks.TESTNET;
  const homeDomain = "viapp.gift";

  it("builds and verifies a valid SEP-10 challenge transaction", () => {
    // 1. Server generates challenge
    const challengeXdr = buildSep10Challenge({
      serverKeypair,
      clientPublicKey: clientKeypair.publicKey(),
      networkPassphrase,
      homeDomain,
      timeoutSeconds: 300,
    });

    expect(typeof challengeXdr).toBe("string");

    // 2. Client inspects, signs the transaction
    const clientTx = new Transaction(challengeXdr, networkPassphrase);
    clientTx.sign(clientKeypair);
    const signedXdr = clientTx.toEnvelope().toXDR("base64");

    // 3. Server verifies client signature
    const result = verifySep10Challenge(
      signedXdr,
      serverKeypair.publicKey(),
      homeDomain,
      networkPassphrase,
    );

    expect(result.valid).toBe(true);
    expect(result.clientPublicKey).toBe(clientKeypair.publicKey());
    expect(result.homeDomain).toBe(homeDomain);
  });

  it("rejects challenge if client signature is missing", () => {
    const challengeXdr = buildSep10Challenge({
      serverKeypair,
      clientPublicKey: clientKeypair.publicKey(),
      networkPassphrase,
      homeDomain,
    });

    // Server verification without client signature must fail
    const result = verifySep10Challenge(
      challengeXdr,
      serverKeypair.publicKey(),
      homeDomain,
      networkPassphrase,
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain("Client signature is missing");
  });

  it("rejects challenge if expired", () => {
    const challengeXdr = buildSep10Challenge({
      serverKeypair,
      clientPublicKey: clientKeypair.publicKey(),
      networkPassphrase,
      homeDomain,
      timeoutSeconds: 60,
    });

    const clientTx = new Transaction(challengeXdr, networkPassphrase);
    clientTx.sign(clientKeypair);
    const signedXdr = clientTx.toEnvelope().toXDR("base64");

    // Check with current time 500 seconds in the future
    const futureTime = Math.floor(Date.now() / 1000) + 500;
    const result = verifySep10Challenge(
      signedXdr,
      serverKeypair.publicKey(),
      homeDomain,
      networkPassphrase,
      futureTime,
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain("expired");
  });
});

describe("SEP-0038: Anchor RFQ Quotes API Client", () => {
  const quoteServerUrl = "https://mock-sep38.viapp.gift";
  const client = new Sep38Client(quoteServerUrl);

  it("fetches supported assets via /info", async () => {
    const mockInfo = {
      assets: [
        { asset: "stellar:native" },
        { asset: "stellar:USDC:GAZWESWQPZOIH2EH3IL37THBLKGLAC5FCHTLMWAXJGLKJPT4NRRIHN6B" },
        { asset: "equity:NVDA" },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockInfo,
    } as any);

    const info = await client.getInfo();
    expect(info.assets.length).toBe(3);
    expect(info.assets[2].asset).toBe("equity:NVDA");
  });

  it("fetches indicative prices via /price", async () => {
    const mockPrice = {
      total_price: "135.50",
      price: "135.50",
      sell_amount: "135.50",
      buy_amount: "1.00",
      fee: { total: "0.50", asset: "stellar:USDC" },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockPrice,
    } as any);

    const price = await client.getPrice({
      context: "sep24",
      sellAsset: "stellar:USDC",
      buyAsset: "equity:NVDA",
      buyAmount: "1.00",
    });

    expect(price.price).toBe("135.50");
    expect(price.buy_amount).toBe("1.00");
  });

  it("requests a firm quote via POST /quote with Bearer auth", async () => {
    const mockQuote = {
      id: "quote-12345",
      expires_at: "2026-11-07T12:00:00Z",
      total_price: "135.50",
      price: "135.50",
      sell_asset: "stellar:USDC",
      sell_amount: "135.50",
      buy_asset: "equity:NVDA",
      buy_amount: "1.00",
      fee: { total: "0.00", asset: "stellar:USDC" },
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockQuote,
    } as any);

    const quote = await client.requestQuote(
      {
        context: "sep24",
        sell_asset: "stellar:USDC",
        buy_asset: "equity:NVDA",
        buy_amount: "1.00",
      },
      "sample-jwt-token",
    );

    expect(quote.id).toBe("quote-12345");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://mock-sep38.viapp.gift/quote",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer sample-jwt-token",
        }),
      }),
    );
  });
});
