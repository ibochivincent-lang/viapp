import { useSyncExternalStore } from "react";
import { isAddress, type Address } from "viem";

/**
 * One stock from GET /api/stocks. `market.open` is null when Binance has no market status for the
 * token, and `nextOpenTime` is a Unix time when it is known (the upstream docs do not say whether
 * seconds or milliseconds, so the picker accepts either).
 */
export type Stock = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  priceUsd: number | null;
  market: { open: boolean | null; nextOpenTime: number | null };
  logoUrl: string | null;
};

export type StocksState =
  | { status: "loading" }
  | { status: "ready"; stocks: readonly Stock[] }
  | { status: "failed" };

type ShareFigure = { state: "loading" } | { state: "ready"; text: string } | { state: "hidden" };

const LOADING: StocksState = { status: "loading" };
const FAILED: StocksState = { status: "failed" };
const REQUEST_TIMEOUT_MS = 20_000;
// One more try after a failure, because the server's first boot can take a few seconds.
const RETRY_DELAY_MS = 5_000;
const SHARE_SYMBOL = "NVDAB";
// Display only: the on-chain name with its legal suffix stripped, so "NVIDIA Corp" reads "NVIDIA".
const NAME_SUFFIXES = [" (bStocks)", " Corporation", " Platforms", " Corp", " Inc.", " Inc"];

const stateByChain: Record<"stellar" | "bnb", StocksState> = {
  stellar: LOADING,
  bnb: LOADING,
};
const listenersByChain: Record<"stellar" | "bnb", Set<() => void>> = {
  stellar: new Set(),
  bnb: new Set(),
};
const startedByChain: Record<"stellar" | "bnb", boolean> = {
  stellar: false,
  bnb: false,
};

function publish(chain: "stellar" | "bnb", next: StocksState): void {
  stateByChain[chain] = next;
  listenersByChain[chain].forEach((listener) => listener());
}

function safeLogo(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const host = url.hostname;
    const okHost =
      host.endsWith(".bnbstatic.com") ||
      host.endsWith(".stellar.org") ||
      host.endsWith("githubusercontent.com") ||
      host.includes("stellar") ||
      host.includes("binance");
    return url.protocol === "https:" && okHost ? url.href : null;
  } catch {
    return null;
  }
}

function isValidAddress(address: unknown): address is string {
  if (typeof address !== "string") return false;
  if (isAddress(address)) return true;
  if ((address.startsWith("C") || address.startsWith("G")) && address.length === 56) return true;
  return false;
}

// The text fields are shown as plain text only, and a price that is not a positive number is dropped.
function parseStocks(body: unknown): Stock[] | null {
  if (typeof body !== "object" || body === null) return null;
  const list = (body as { stocks?: unknown }).stocks;
  if (!Array.isArray(list)) return null;
  const stocks: Stock[] = [];
  for (const row of list as unknown[]) {
    if (typeof row !== "object" || row === null) continue;
    const { address, symbol, name, decimals, priceUsd, market, logoUrl } = row as Record<string, unknown>;
    if (!isValidAddress(address)) continue;
    if (typeof symbol !== "string" || typeof name !== "string") continue;
    if (typeof decimals !== "number" || !Number.isInteger(decimals) || decimals < 0 || decimals > 77) continue;
    const price = typeof priceUsd === "string" ? Number(priceUsd) : typeof priceUsd === "number" ? priceUsd : Number.NaN;
    const { open, nextOpenTime } = (typeof market === "object" && market !== null ? market : {}) as Record<string, unknown>;
    stocks.push({
      address,
      symbol,
      name,
      decimals,
      priceUsd: Number.isFinite(price) && price > 0 ? price : null,
      market: {
        open: typeof open === "boolean" ? open : null,
        nextOpenTime: typeof nextOpenTime === "number" && Number.isFinite(nextOpenTime) && nextOpenTime > 0 ? nextOpenTime : null,
      },
      logoUrl: safeLogo(logoUrl),
    });
  }
  return stocks;
}

async function fetchStocks(chain: "stellar" | "bnb"): Promise<Stock[] | null> {
  try {
    const url = `/api/stocks?chain=${chain}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { accept: "application/json", "x-viapp-chain": chain },
    });
    if (!response.ok) return null;
    return parseStocks(await response.json());
  } catch {
    return null;
  }
}

async function loadChain(chain: "stellar" | "bnb"): Promise<void> {
  let stocks = await fetchStocks(chain);
  if (stocks === null) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    stocks = await fetchStocks(chain);
  }
  publish(chain, stocks === null ? FAILED : { status: "ready", stocks });
}

function subscribeChain(chain: "stellar" | "bnb", listener: () => void): () => void {
  listenersByChain[chain].add(listener);
  if (!startedByChain[chain]) {
    startedByChain[chain] = true;
    void loadChain(chain);
  }
  return () => {
    listenersByChain[chain].delete(listener);
  };
}

/** The live stock list from GET /api/stocks, fetched once and shared by every component on the page. */
export function useStocks(chain: "stellar" | "bnb" = "stellar"): StocksState {
  return useSyncExternalStore(
    (listener) => subscribeChain(chain, listener),
    () => stateByChain[chain],
    () => LOADING,
  );
}

/**
 * A share count as people read it: four decimals, so "0.004286236788621920957187943902261" shows as
 * "0.0043". The chain keeps every digit; this is display only.
 */
export function formatShares(text: string): string {
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0) return text;
  return value < 0.0001 ? value.toPrecision(2) : value.toFixed(4);
}

/** The on-chain name with legal suffixes removed: "Tesla, Inc." becomes "Tesla". */
export function displayName(name: string): string {
  let text = name.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of NAME_SUFFIXES) {
      if (text.endsWith(suffix) && text.length > suffix.length) {
        text = text.slice(0, -suffix.length).trimEnd();
        changed = true;
      }
    }
    // "Tesla, Inc." leaves a comma behind once the suffix is gone.
    if (text.endsWith(",") && text.length > 1) {
      text = text.slice(0, -1).trimEnd();
      changed = true;
    }
  }
  return text;
}

/** The display name uppercased for the ticker: "NVIDIA Corp" becomes "NVIDIA". */
function tickerName(name: string): string {
  return displayName(name).toUpperCase();
}

/** A price rounded to 2 decimals with thousands separators, for example 1,234.50. */
function formatPrice(price: number): string {
  return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type TickerEntry = { symbol: string; name: string; price: string };

/** One entry per stock that has a live price. A stock without a price is left out, never guessed. */
export function tickerEntries(stocks: readonly Stock[]): TickerEntry[] {
  const entries: TickerEntry[] = [];
  for (const stock of stocks) {
    if (stock.priceUsd === null) continue;
    entries.push({ symbol: stock.symbol, name: tickerName(stock.name), price: formatPrice(stock.priceUsd) });
  }
  return entries;
}

/** How many NVDA shares one dollar buys at the live price: 1 / priceUsd, to four decimals. */
export function useShareFigure(): ShareFigure {
  const state = useStocks();
  if (state.status === "loading") return { state: "loading" };
  if (state.status === "failed") return { state: "hidden" };
  const price = state.stocks.find((stock) => stock.symbol === "NVDA" || stock.symbol === SHARE_SYMBOL)?.priceUsd ?? null;
  if (price === null) return { state: "hidden" };
  return { state: "ready", text: (1 / price).toFixed(4) };
}
