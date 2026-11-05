import { Asset, Operation, StrKey } from "@stellar/stellar-sdk";
import { z } from "zod";
import { findStellarStock, getStellarStocks, type StellarStock } from "./stocks-stellar.js";

export type StellarQuoteErrorCode =
  | "bad_request"
  | "bad_stock"
  | "bad_wallet"
  | "bad_amount"
  | "amount_too_small"
  | "amount_too_large"
  | "not_listed";

export type StellarQuoteParams = {
  stock: string;
  usdAmount: string;
  wallet: string;
  networkPassphrase: string;
  slippageBps?: number; // default 100 bps (1%)
};

export type StellarQuoteSuccess = {
  ok: true;
  chain: "stellar";
  stock: StellarStock;
  usdAmount: string;
  expectedShares: string;
  minShares: string;
  priceUsd: string;
  trustlineRequired: boolean;
};

export type StellarQuoteResponse =
  | { status: 200; body: StellarQuoteSuccess }
  | { status: number; body: { ok: false; error: StellarQuoteErrorCode } };

const MIN_USD = 1.0;
const MAX_USD = 100.0;

/**
 * Handles stock quoting on Stellar Network.
 * Calculates expected stock units and minimum output based on USD valuation and price feed.
 */
export function handleStellarQuote(params: StellarQuoteParams): StellarQuoteResponse {
  const { stock: stockCode, usdAmount, wallet, networkPassphrase, slippageBps = 100 } = params;

  if (!StrKey.isValidEd25519PublicKey(wallet)) {
    return { status: 400, body: { ok: false, error: "bad_wallet" } };
  }

  const numUsd = parseFloat(usdAmount);
  if (isNaN(numUsd) || numUsd <= 0) {
    return { status: 400, body: { ok: false, error: "bad_amount" } };
  }
  if (numUsd < MIN_USD) {
    return { status: 400, body: { ok: false, error: "amount_too_small" } };
  }
  if (numUsd > MAX_USD) {
    return { status: 400, body: { ok: false, error: "amount_too_large" } };
  }

  const stock = findStellarStock(stockCode, networkPassphrase);
  if (!stock || !stock.priceUsd) {
    return { status: 400, body: { ok: false, error: "not_listed" } };
  }

  const price = parseFloat(stock.priceUsd);
  const rawExpectedShares = numUsd / price;
  const rawMinShares = rawExpectedShares * (1 - slippageBps / 10000);

  // Stellar assets use 7 decimal places
  const expectedShares = rawExpectedShares.toFixed(7);
  const minShares = rawMinShares.toFixed(7);

  return {
    status: 200,
    body: {
      ok: true,
      chain: "stellar",
      stock,
      usdAmount: numUsd.toFixed(2),
      expectedShares,
      minShares,
      priceUsd: stock.priceUsd,
      trustlineRequired: stock.code !== "XLM",
    },
  };
}

