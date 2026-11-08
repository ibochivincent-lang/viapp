import { Asset } from "@stellar/stellar-sdk";

export type StockVenue = "bnb" | "okx" | "stellar";

export type StellarStock = {
  chain: "stellar";
  address: string;
  code: string;
  symbol: string;
  issuer: string;
  contractId: string;
  name: string;
  decimals: number;
  uiMultiplier: string;
  priceUsd: string | null;
  market: {
    open: boolean | null;
    reasonCode: string | null;
    reasonMsg: string | null;
    nextOpenTime: number | null;
  };
  logoUrl: string | null;
  venue?: StockVenue;
  backingSymbol?: string;
  backingContract?: string;
};

// Known testnet/mainnet issuers for tokenized equities and base currencies on Stellar
export const STELLAR_TESTNET_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
export const STELLAR_MAINNET_USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
export const STELLAR_MAINNET_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

export const STELLAR_STOCKS_CATALOG: Omit<StellarStock, "contractId" | "address" | "symbol">[] = [
  // --- Canonical Stellar Equities ---
  {
    chain: "stellar",
    code: "AAPL",
    name: "Apple Inc.",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "228.50",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "stellar",
  },
  {
    chain: "stellar",
    code: "NVDA",
    name: "NVIDIA Corp",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "142.20",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "stellar",
  },
  {
    chain: "stellar",
    code: "TSLA",
    name: "Tesla, Inc.",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "248.80",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "stellar",
  },
  {
    chain: "stellar",
    code: "MSFT",
    name: "Microsoft Corp",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "418.30",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "stellar",
  },
  {
    chain: "stellar",
    code: "AMZN",
    name: "Amazon.com Inc.",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "186.40",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "stellar",
  },
  {
    chain: "stellar",
    code: "GOOGL",
    name: "Alphabet Inc.",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "167.10",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "stellar",
  },
  {
    chain: "stellar",
    code: "META",
    name: "Meta Platforms Inc.",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "589.60",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "stellar",
  },
  {
    chain: "stellar",
    code: "SPY",
    name: "SPDR S&P 500 ETF",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "572.30",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "stellar",
  },
  {
    chain: "stellar",
    code: "QQQ",
    name: "Invesco QQQ Trust",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "488.90",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "stellar",
  },

  // --- bStocks Full Allowlist on Stellar (9 Stocks, BNB Chain backing) ---
  {
    chain: "stellar",
    code: "AAPLB",
    name: "Apple Inc. (bStock)",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "228.50",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "bnb",
    backingSymbol: "AAPLB",
    backingContract: "0x431a3BEE82E2ca41e49895CbECE5bB0F76A89b7A",
  },
  {
    chain: "stellar",
    code: "NVDAB",
    name: "NVIDIA Corp (bStock)",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "142.20",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "bnb",
    backingSymbol: "NVDAB",
    backingContract: "0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436",
  },
  {
    chain: "stellar",
    code: "TSLAB",
    name: "Tesla, Inc. (bStock)",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "248.80",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "bnb",
    backingSymbol: "TSLAB",
    backingContract: "0x5b1910eAaD6450E50f816082Aa078C41F10C292f",
  },
  {
    chain: "stellar",
    code: "MSFTB",
    name: "Microsoft Corp (bStock)",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "418.30",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "bnb",
    backingSymbol: "MSFTB",
    backingContract: "0x80106cb3EAD06659A5ad19DF39D9b4733863B9b0",
  },
  {
    chain: "stellar",
    code: "AMZNB",
    name: "Amazon.com Inc. (bStock)",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "186.40",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "bnb",
    backingSymbol: "AMZNB",
    backingContract: "0x1a4b499833A79A09ad7Cf1D42D7DacF71e92eb00",
  },
  {
    chain: "stellar",
    code: "GOOGLB",
    name: "Alphabet Inc. (bStock)",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "167.10",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "bnb",
    backingSymbol: "GOOGLB",
    backingContract: "0x3F53De71c126BdaBAe20f9cD64848d317f6C3238",
  },
  {
    chain: "stellar",
    code: "METAB",
    name: "Meta Platforms (bStock)",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "589.60",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "bnb",
    backingSymbol: "METAB",
    backingContract: "0x7425889FE94F9d693E8daefE88BCCed6AcFEf4c0",
  },
  {
    chain: "stellar",
    code: "SPYB",
    name: "SPDR S&P 500 ETF (bStock)",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "572.30",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "bnb",
    backingSymbol: "SPYB",
    backingContract: "0x7138b48df7D98D7e3cc221BfE7192D0a178182D8",
  },
  {
    chain: "stellar",
    code: "QQQB",
    name: "Invesco QQQ Trust (bStock)",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "488.90",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "bnb",
    backingSymbol: "QQQB",
    backingContract: "0x205812CdBed920aFf76C6580abD681a46D11efc7",
  },

  // --- OKX X Layer xStocks Full Allowlist on Stellar (7 Stocks + Settlement Tokens) ---
  {
    chain: "stellar",
    code: "AAPLx",
    name: "Apple Inc. (xStock)",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "228.50",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "okx",
    backingSymbol: "AAPLx",
    backingContract: "0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a",
  },
  {
    chain: "stellar",
    code: "MSFTx",
    name: "Microsoft Corp (xStock)",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "418.30",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "okx",
    backingSymbol: "MSFTx",
    backingContract: "0x5621737f42dae558b81269fcb9e9e70c19aa6b35",
  },
  {
    chain: "stellar",
    code: "NVDAx",
    name: "NVIDIA Corp (xStock)",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "142.20",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "okx",
    backingSymbol: "NVDAx",
    backingContract: "0xc845b2894dbddd03858fd2d643b4ef725fe0849d",
  },
  {
    chain: "stellar",
    code: "GOOGLx",
    name: "Alphabet Inc. (xStock)",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "167.10",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "okx",
    backingSymbol: "GOOGLx",
    backingContract: "0xe92f673ca36c5e2efd2de7628f815f84807e803f",
  },
  {
    chain: "stellar",
    code: "AMZNx",
    name: "Amazon.com Inc. (xStock)",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "186.40",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "okx",
    backingSymbol: "AMZNx",
    backingContract: "0x3557ba345b01efa20a1bddc61f573bfd87195081",
  },
  {
    chain: "stellar",
    code: "METAx",
    name: "Meta Platforms (xStock)",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "589.60",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "okx",
    backingSymbol: "METAx",
    backingContract: "0x96702be57cd9777f835117a809c7124fe4ec989a",
  },
  {
    chain: "stellar",
    code: "TSLAx",
    name: "Tesla, Inc. (xStock)",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "248.80",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "okx",
    backingSymbol: "TSLAx",
    backingContract: "0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0",
  },

  // --- Settlement Currencies & Cash Equivalents on Stellar ---
  {
    chain: "stellar",
    code: "USDG",
    name: "Global Dollar (OKX Settlement)",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "1.00",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "okx",
    backingSymbol: "USDG",
    backingContract: "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8",
  },
  {
    chain: "stellar",
    code: "USDC",
    name: "USD Coin",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "1.00",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "stellar",
  },
  {
    chain: "stellar",
    code: "XLM",
    name: "Stellar Lumens",
    issuer: "", // Native asset
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "0.10",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: null,
    venue: "stellar",
  },
];

/**
 * Returns listed tokenized stocks on Stellar, complete with SAC contract IDs for the given passphrase.
 * Filters out currency assets (USDC, XLM, USDG) so only giftable equities are returned.
 * Optionally filters by venue ("bnb" | "okx" | "stellar").
 */
export function getStellarStocks(networkPassphrase: string, venue?: StockVenue): StellarStock[] {
  let equities = STELLAR_STOCKS_CATALOG.filter(
    (item) => item.code !== "USDC" && item.code !== "XLM" && item.code !== "USDG",
  );
  if (venue) {
    equities = equities.filter((item) => item.venue === venue);
  }
  return equities.map((item) => {
    const asset = item.code === "XLM" ? Asset.native() : new Asset(item.code, item.issuer);
    let contractId = "";
    try {
      contractId = asset.contractId(networkPassphrase);
    } catch {
      contractId = item.code;
    }
    return {
      ...item,
      address: contractId,
      symbol: item.code,
      contractId,
    };
  });
}

/**
 * Returns all 9 BSC bStocks on Stellar.
 */
export function getBscStocks(networkPassphrase: string): StellarStock[] {
  return getStellarStocks(networkPassphrase, "bnb");
}

/**
 * Returns all 7 OKX X Layer xStocks on Stellar.
 */
export function getXLayerStocks(networkPassphrase: string): StellarStock[] {
  return getStellarStocks(networkPassphrase, "okx");
}

/**
 * Looks up a single Stellar stock by its symbol/code.
 * Matches exact code first, then normalized symbol.
 */
export function findStellarStock(code: string, networkPassphrase: string): StellarStock | undefined {
  const normalized = code.trim().toUpperCase();
  const stocks = getStellarStocks(networkPassphrase);
  
  // 1. Try case-insensitive exact code or symbol match
  const exact = stocks.find((s) => s.code.toUpperCase() === normalized || s.symbol.toUpperCase() === normalized);
  if (exact) return exact;

  // 2. Try stripped suffix (e.g. "NVDAX" -> "NVDA" or "NVDA" -> "NVDAX" or "NVDAB")
  const base = normalized.replace(/[BX]$/, "");
  return stocks.find((s) => {
    const sBase = s.code.toUpperCase().replace(/[BX]$/, "");
    return sBase === base;
  });
}
