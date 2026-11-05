import { Asset } from "@stellar/stellar-sdk";

export type StellarStock = {
  chain: "stellar";
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
};

// Known testnet/mainnet issuers for tokenized equities and base currencies on Stellar
export const STELLAR_TESTNET_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
export const STELLAR_MAINNET_USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

export const STELLAR_STOCKS_CATALOG: Omit<StellarStock, "contractId">[] = [
  {
    chain: "stellar",
    code: "AAPL",
    name: "Apple Inc.",
    issuer: STELLAR_TESTNET_ISSUER,
    decimals: 7,
    uiMultiplier: "10000000",
    priceUsd: "228.50",
    market: { open: true, reasonCode: null, reasonMsg: null, nextOpenTime: null },
    logoUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
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
  },
];

/**
 * Returns listed tokenized stocks and assets on Stellar, complete with SAC contract IDs for the given passphrase.
 */
export function getStellarStocks(networkPassphrase: string): StellarStock[] {
  return STELLAR_STOCKS_CATALOG.map((item) => {
    const asset = item.code === "XLM" ? Asset.native() : new Asset(item.code, item.issuer);
    let contractId = "";
    try {
      contractId = asset.contractId(networkPassphrase);
    } catch {
      contractId = item.code;
    }
    return {
      ...item,
      symbol: item.code,
      contractId,
    };
  });
}

/**
 * Looks up a single Stellar stock by its symbol/code.
 */
export function findStellarStock(code: string, networkPassphrase: string): StellarStock | undefined {
  const normalized = code.trim().toUpperCase();
  const stocks = getStellarStocks(networkPassphrase);
  return stocks.find((s) => s.code === normalized);
}

