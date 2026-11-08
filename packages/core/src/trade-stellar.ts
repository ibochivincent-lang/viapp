/**
 * ViApp Stellar Trading & Liquidity Pool Engine
 *
 * Implements SDEX orderbook trading, Soroban SAC token holding,
 * and Constant-Product AMM Liquidity Pools for tokenized equities
 * (bStocks from BNB Chain) on the Stellar Network.
 */

import {
  Account,
  Address,
  Asset,
  Contract,
  LiquidityPoolFeeV18,
  nativeToScVal,
  Operation,
  TimeoutInfinite,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { findStellarStock, getStellarStocks, STELLAR_TESTNET_ISSUER, type StellarStock, type StockVenue } from "./stocks-stellar.js";

export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
export const MAINNET_PASSPHRASE = "Public Global Stellar Network ; September 2015";

export interface TradeOrderParams {
  stockCode: string;
  counterAssetCode: "USDC" | "XLM";
  side: "buy" | "sell";
  amount: string; // Stock shares for sell, counter asset amount for buy
  limitPrice: string; // Price in counterAsset per stock share
  userStellarAddress: string;
  venueType?: "sdex" | "amm";
  slippageBps?: number; // default 50 bps (0.5%)
}

export interface TradeSimulationResult {
  ok: true;
  stockCode: string;
  counterAssetCode: string;
  side: "buy" | "sell";
  inputAmount: string;
  expectedOutputAmount: string;
  minOutputAmount: string;
  executionPrice: string;
  priceImpactPct: string;
  feeAmount: string;
  venueType: "sdex" | "amm";
  sacContractId: string;
}

export interface AmmPoolState {
  reserveStock: bigint; // 7 decimal places base units
  reserveCounter: bigint; // 7 decimal places base units
  feeBps: number; // e.g. 30 for 0.3%
  totalLpSupply: bigint;
}

// 7 decimal places precision on Stellar (1 unit = 10,000,000 stroops/base units)
export const STELLAR_DECIMALS = 7;
export const STROOPS_PER_UNIT = 10_000_000n;

/**
 * Converts decimal string to 7-decimal base units (bigint).
 */
export function toBaseUnits(amountStr: string): bigint {
  const parts = amountStr.trim().split(".");
  const integerPart = BigInt(parts[0] || "0") * STROOPS_PER_UNIT;
  let fractionStr = (parts[1] || "").slice(0, STELLAR_DECIMALS).padEnd(STELLAR_DECIMALS, "0");
  const fractionPart = BigInt(fractionStr);
  return integerPart + fractionPart;
}

/**
 * Formats base units to decimal string.
 */
export function fromBaseUnits(units: bigint): string {
  const sign = units < 0n ? "-" : "";
  const abs = units < 0n ? -units : units;
  const intPart = abs / STROOPS_PER_UNIT;
  const fracPart = abs % STROOPS_PER_UNIT;
  const fracStr = fracPart.toString().padStart(STELLAR_DECIMALS, "0").replace(/0+$/, "");
  return fracStr.length > 0 ? `${sign}${intPart}.${fracStr}` : `${sign}${intPart}.0`;
}

/**
 * Computes deterministic Soroban SAC contract ID for any Stellar asset.
 */
export function getSacContractId(assetCode: string, issuer: string, networkPassphrase = TESTNET_PASSPHRASE): string {
  const asset = assetCode === "XLM" ? Asset.native() : new Asset(assetCode, issuer);
  return asset.contractId(networkPassphrase);
}

/**
 * Builds a ChangeTrust operation to establish a trustline in a Stellar wallet
 * for any tokenized stock or settlement token.
 */
export function buildChangeTrustOp(assetCode: string, issuer: string, limit?: string): xdr.Operation {
  const asset = new Asset(assetCode, issuer);
  return Operation.changeTrust({
    asset,
    limit: limit ?? "922337203685.4775807", // Max Stellar trustline limit
  });
}

/**
 * Builds an SDEX ManageBuyOffer operation.
 * When buying stock with USDC: selling = USDC, buying = Stock.
 */
export function buildSdexBuyOfferOp(params: {
  stockAsset: Asset;
  counterAsset: Asset;
  buyShares: string;
  pricePerShare: string;
  offerId?: string;
}): xdr.Operation {
  return Operation.manageBuyOffer({
    selling: params.counterAsset,
    buying: params.stockAsset,
    buyAmount: params.buyShares,
    price: params.pricePerShare,
    offerId: params.offerId ?? "0",
  });
}

/**
 * Builds an SDEX ManageSellOffer operation.
 * When selling stock for USDC: selling = Stock, buying = USDC.
 */
export function buildSdexSellOfferOp(params: {
  stockAsset: Asset;
  counterAsset: Asset;
  sellShares: string;
  pricePerShare: string;
  offerId?: string;
}): xdr.Operation {
  return Operation.manageSellOffer({
    selling: params.stockAsset,
    buying: params.counterAsset,
    amount: params.sellShares,
    price: params.pricePerShare,
    offerId: params.offerId ?? "0",
  });
}

/**
 * Builds a PathPaymentStrictReceive operation for instant SDEX execution.
 */
export function buildSdexPathPaymentStrictReceiveOp(params: {
  sourceAsset: Asset;
  maxSourceAmount: string;
  destinationAccount: string;
  destinationAsset: Asset;
  destinationAmount: string;
  path?: Asset[];
}): xdr.Operation {
  return Operation.pathPaymentStrictReceive({
    sendAsset: params.sourceAsset,
    sendMax: params.maxSourceAmount,
    destination: params.destinationAccount,
    destAsset: params.destinationAsset,
    destAmount: params.destinationAmount,
    path: params.path ?? [],
  });
}

/**
 * Calculates Constant-Product ($x \cdot y = k$) AMM swap output amount.
 * Returns output base units and fee base units.
 */
export function calculateAmmSwapOutput(
  reserveIn: bigint,
  reserveOut: bigint,
  amountIn: bigint,
  feeBps = 30, // 0.3%
): { amountOut: bigint; feeAmount: bigint } {
  if (reserveIn <= 0n || reserveOut <= 0n || amountIn <= 0n) {
    return { amountOut: 0n, feeAmount: 0n };
  }

  const boundedFeeBps = Math.max(0, Math.min(10000, feeBps));
  const feeAmount = (amountIn * BigInt(boundedFeeBps)) / 10000n;
  const amountInWithFee = amountIn - feeAmount;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn + amountInWithFee;
  if (denominator <= 0n) {
    return { amountOut: 0n, feeAmount };
  }
  const amountOut = numerator / denominator;

  return { amountOut, feeAmount };
}

/**
 * Calculates Constant-Product ($x \cdot y = k$) AMM required input amount for exact output.
 */
export function calculateAmmSwapInput(
  reserveIn: bigint,
  reserveOut: bigint,
  amountOut: bigint,
  feeBps = 30,
): { amountIn: bigint; feeAmount: bigint } {
  if (reserveIn <= 0n || reserveOut <= 0n || amountOut <= 0n || amountOut >= reserveOut) {
    throw new Error("Invalid reserves or output amount exceeds pool reserve");
  }

  const boundedFeeBps = Math.max(0, Math.min(9999, feeBps));
  const numerator = reserveIn * amountOut * 10000n;
  const denominator = (reserveOut - amountOut) * BigInt(10000 - boundedFeeBps);
  if (denominator <= 0n) {
    throw new Error("Invalid fee or pool denominator");
  }
  const amountIn = (numerator + denominator - 1n) / denominator; // ceiling division
  const feeAmount = (amountIn * BigInt(boundedFeeBps)) / 10000n;

  return { amountIn, feeAmount };
}

/**
 * Calculates price impact percentage for an AMM swap.
 */
export function calculatePriceImpact(
  reserveIn: bigint,
  reserveOut: bigint,
  amountIn: bigint,
  amountOut: bigint,
): number {
  if (reserveIn <= 0n || reserveOut <= 0n || amountIn <= 0n || amountOut <= 0n) {
    return 0;
  }
  // Mid-market price = reserveOut / reserveIn
  // Effective price = amountOut / amountIn
  const midPrice = Number(reserveOut) / Number(reserveIn);
  if (midPrice <= 0 || !Number.isFinite(midPrice)) return 0;

  const execPrice = Number(amountOut) / Number(amountIn);
  if (execPrice <= 0 || !Number.isFinite(execPrice)) return 0;

  const impact = ((midPrice - execPrice) / midPrice) * 100;
  if (!Number.isFinite(impact)) return 0;
  return Math.max(0, Math.min(100, impact));
}

/**
 * Calculates deposit amounts and LP tokens for an AMM pool.
 */
export function calculateAmmDeposit(
  pool: AmmPoolState,
  amountStock: bigint,
): { amountCounter: bigint; lpTokensMinted: bigint } {
  if (amountStock <= 0n) {
    return { amountCounter: 0n, lpTokensMinted: 0n };
  }
  if (pool.totalLpSupply === 0n || pool.reserveStock === 0n) {
    // Initial deposit or unseeded stock reserve
    const amountCounter = amountStock; // 1:1 initial price ratio if empty
    const lpTokensMinted = amountStock;
    return { amountCounter, lpTokensMinted };
  }

  const amountCounter = (amountStock * pool.reserveCounter) / pool.reserveStock;
  const lpTokensMinted = (amountStock * pool.totalLpSupply) / pool.reserveStock;
  return { amountCounter, lpTokensMinted };
}

/**
 * Simulates a trade on Stellar across SDEX or Soroban AMM for any bStock.
 */
export function simulateTrade(
  params: TradeOrderParams,
  networkPassphrase = TESTNET_PASSPHRASE,
  customPoolState?: AmmPoolState,
): TradeSimulationResult {
  const stock = findStellarStock(params.stockCode, networkPassphrase);
  if (!stock || !stock.priceUsd) {
    throw new Error(`Stock not listed on Stellar: ${params.stockCode}`);
  }

  const inputUnits = toBaseUnits(params.amount);
  if (inputUnits <= 0n) {
    throw new Error("Trade amount must be greater than zero");
  }

  const priceNum = parseFloat(stock.priceUsd);
  const slippageBps = Math.max(0, Math.min(10000, params.slippageBps ?? 50));
  const venueType = params.venueType ?? "amm";

  // Default simulated pool depth: 5,000 shares & proportional counter asset
  const defaultStockReserve = toBaseUnits("5000.0");
  const defaultCounterReserve = toBaseUnits((5000.0 * priceNum).toFixed(7));
  const pool: AmmPoolState = customPoolState ?? {
    reserveStock: defaultStockReserve,
    reserveCounter: defaultCounterReserve,
    feeBps: 30,
    totalLpSupply: defaultStockReserve,
  };

  if (params.side === "buy") {
    // Buyer provides counter asset (e.g. 50 USDC) to acquire stock shares
    const { amountOut, feeAmount } = calculateAmmSwapOutput(
      pool.reserveCounter,
      pool.reserveStock,
      inputUnits,
      pool.feeBps,
    );

    if (amountOut <= 0n) {
      throw new Error("Trade input amount is too small to yield any output shares");
    }

    const minOutputUnits = (amountOut * BigInt(10000 - slippageBps)) / 10000n;
    const impact = calculatePriceImpact(pool.reserveCounter, pool.reserveStock, inputUnits, amountOut);
    const inDec = Number(fromBaseUnits(inputUnits));
    const outDec = Number(fromBaseUnits(amountOut));
    const execPrice = outDec > 0 ? (inDec / outDec).toFixed(4) : priceNum.toFixed(4);

    return {
      ok: true,
      stockCode: stock.code,
      counterAssetCode: params.counterAssetCode,
      side: "buy",
      inputAmount: params.amount,
      expectedOutputAmount: fromBaseUnits(amountOut),
      minOutputAmount: fromBaseUnits(minOutputUnits),
      executionPrice: execPrice,
      priceImpactPct: impact.toFixed(2),
      feeAmount: fromBaseUnits(feeAmount),
      venueType,
      sacContractId: stock.contractId,
    };
  } else {
    // Seller provides stock shares (e.g. 2 AAPL) to receive counter asset
    const { amountOut, feeAmount } = calculateAmmSwapOutput(
      pool.reserveStock,
      pool.reserveCounter,
      inputUnits,
      pool.feeBps,
    );

    if (amountOut <= 0n) {
      throw new Error("Trade input shares too small to yield any counter asset output");
    }

    const minOutputUnits = (amountOut * BigInt(10000 - slippageBps)) / 10000n;
    const impact = calculatePriceImpact(pool.reserveStock, pool.reserveCounter, inputUnits, amountOut);
    const inDec = Number(fromBaseUnits(inputUnits));
    const outDec = Number(fromBaseUnits(amountOut));
    const execPrice = inDec > 0 ? (outDec / inDec).toFixed(4) : priceNum.toFixed(4);

    return {
      ok: true,
      stockCode: stock.code,
      counterAssetCode: params.counterAssetCode,
      side: "sell",
      inputAmount: params.amount,
      expectedOutputAmount: fromBaseUnits(amountOut),
      minOutputAmount: fromBaseUnits(minOutputUnits),
      executionPrice: execPrice,
      priceImpactPct: impact.toFixed(2),
      feeAmount: fromBaseUnits(feeAmount),
      venueType,
      sacContractId: stock.contractId,
    };
  }
}

/**
 * Builds a complete un-simulated Stellar transaction for SDEX Order Placement.
 */
export function buildSdexOrderTx(params: {
  sourceAccount: Account;
  stockCode: string;
  counterAssetCode: "USDC" | "XLM";
  side: "buy" | "sell";
  shares: string;
  pricePerShare: string;
  networkPassphrase?: string;
  issuer?: string;
  baseFee?: string;
}): Transaction {
  const passphrase = params.networkPassphrase ?? TESTNET_PASSPHRASE;
  const issuer = params.issuer ?? STELLAR_TESTNET_ISSUER;
  const stockAsset = new Asset(params.stockCode, issuer);
  const counterAsset = params.counterAssetCode === "XLM"
    ? Asset.native()
    : new Asset("USDC", issuer);

  const op = params.side === "buy"
    ? buildSdexBuyOfferOp({
        stockAsset,
        counterAsset,
        buyShares: params.shares,
        pricePerShare: params.pricePerShare,
      })
    : buildSdexSellOfferOp({
        stockAsset,
        counterAsset,
        sellShares: params.shares,
        pricePerShare: params.pricePerShare,
      });

  return new TransactionBuilder(params.sourceAccount, {
    fee: params.baseFee ?? "100000",
    networkPassphrase: passphrase,
  })
    .addOperation(op)
    .setTimeout(TimeoutInfinite)
    .build();
}

/**
 * Builds an operation for calling a Soroban SAC transfer function.
 */
export function buildSacTransferOp(params: {
  sacContractId: string;
  from: string;
  to: string;
  amount: bigint;
}): xdr.Operation {
  const contract = new Contract(params.sacContractId);
  return contract.call(
    "transfer",
    nativeToScVal(new Address(params.from), { type: "address" }),
    nativeToScVal(new Address(params.to), { type: "address" }),
    nativeToScVal(params.amount, { type: "i128" }),
  );
}

/**
 * Returns list of all tradable stock pairs available on Stellar.
 */
export function getTradablePairs(networkPassphrase = TESTNET_PASSPHRASE): {
  pair: string;
  stock: StellarStock;
  counter: "USDC" | "XLM";
  venue: StockVenue;
}[] {
  const stocks = getStellarStocks(networkPassphrase);
  const pairs: {
    pair: string;
    stock: StellarStock;
    counter: "USDC" | "XLM";
    venue: StockVenue;
  }[] = [];

  for (const stock of stocks) {
    const venue = stock.venue ?? "stellar";
    pairs.push({
      pair: `${stock.code}/USDC`,
      stock,
      counter: "USDC",
      venue,
    });
    pairs.push({
      pair: `${stock.code}/XLM`,
      stock,
      counter: "XLM",
      venue,
    });
  }

  return pairs;
}
