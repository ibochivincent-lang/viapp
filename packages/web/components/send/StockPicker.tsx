"use client";

import { useState } from "react";
import { displayName, type Stock, type StocksState } from "@/lib/stocks";
import { opensText, usd } from "./format";

/** True unless the market is known to be closed. Checks live market status and quotes. */
export function isTradable(stock: Stock): boolean {
  return stock.market.open !== false;
}

function StockLogo({ symbol }: { symbol: string }) {
  const s = symbol.toUpperCase().replace(/B$/, "");
  switch (s) {
    case "AAPL":
      return (
        <span className="send-logo send-logo-apple" aria-hidden="true">
          <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#242426" />
            <path fill="#ffffff" d="M15.5 19.8c-.6.9-1.2 1.7-2.1 1.7-.9 0-1.2-.6-2.3-.6s-1.4.6-2.3.6c-.9 0-1.6-.9-2.2-1.8-1.2-1.8-2.1-5-1-7.2.6-1.1 1.7-1.8 2.9-1.8.9 0 1.8.6 2.3.6.6 0 1.6-.7 2.7-.6.5 0 1.8.2 2.6 1.4-.1.1-1.5.9-1.5 2.7 0 2.2 1.9 2.9 1.9 2.9-.3 1-1 2.1-1.5 2.8zM13.7 10.3c.4-.6.7-1.3.6-2.1-.7 0-1.5.5-1.9 1-.4.5-.8 1.3-.7 2 .8 0 1.5-.4 2-.9z" />
          </svg>
        </span>
      );
    case "NVDA":
      return (
        <span className="send-logo send-logo-nvda" aria-hidden="true">
          <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#0c170c" />
            <path fill="#76B900" d="M14 6C9.6 6 6 9.6 6 14c0 3.3 2 6.1 4.9 7.3v-2.1c-1.8-1-3-3-3-5.2 0-3.3 2.7-6 6-6 2.3 0 4.2 1.3 5.2 3.1h2.2C20.1 8.5 17.3 6 14 6zm0 4c-2.2 0-4 1.8-4 4 0 1.6 1 3 2.4 3.6v-1.7c-.6-.4-1-1.1-1-1.9 0-1.4 1.1-2.5 2.5-2.5 1 0 1.9.6 2.3 1.5h1.7C17.4 11.4 15.8 10 14 10zm-1.1 6.5c-.3 0-.5-.2-.5-.5s.2-.5.5-.5.5.2.5.5-.2.5-.5.5z" />
          </svg>
        </span>
      );
    case "TSLA":
      return (
        <span className="send-logo send-logo-tsla" aria-hidden="true">
          <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#E82127" />
            <path fill="#ffffff" d="M14 8.5c1.8 0 3.8.3 5.5 1-.4.8-1 1.2-1.7 1.3-1.2-.4-2.5-.5-3.8-.5-1.3 0-2.6.1-3.8.5-.7-.1-1.3-.5-1.7-1.3 1.7-.7 3.7-1 5.5-1zm0 3.2c1.7 0 3.4.2 4.9.8-.3.7-.8 1-1.4 1.1-1.1-.3-2.3-.4-3.5-.4-1.2 0-2.4.1-3.5.4-.6-.1-1.1-.4-1.4-1.1 1.5-.6 3.2-.8 4.9-.8zm-1.1 2.8h2.2v7h-2.2v-7z" />
          </svg>
        </span>
      );
    case "MSFT":
      return (
        <span className="send-logo send-logo-msft" aria-hidden="true">
          <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#242424" />
            <rect x="8" y="8" width="5.4" height="5.4" rx="0.5" fill="#F25022" />
            <rect x="14.6" y="8" width="5.4" height="5.4" rx="0.5" fill="#7FBA00" />
            <rect x="8" y="14.6" width="5.4" height="5.4" rx="0.5" fill="#00A4EF" />
            <rect x="14.6" y="14.6" width="5.4" height="5.4" rx="0.5" fill="#FFB900" />
          </svg>
        </span>
      );
    case "AMZN":
      return (
        <span className="send-logo send-logo-amzn" aria-hidden="true">
          <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#232F3E" />
            <text x="14" y="15.2" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontFamily="system-ui, sans-serif" fontWeight="bold">a</text>
            <path d="M9 18.5c2.8 1.8 7.2 1.8 10 0" stroke="#FF9900" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M19.2 17.5l.8 1.4-1.6.2" fill="#FF9900" />
          </svg>
        </span>
      );
    case "GOOGL":
      return (
        <span className="send-logo send-logo-googl" aria-hidden="true">
          <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#FFFFFF" />
            <path fill="#4285F4" d="M19.8 14.2c0-.5 0-.9-.1-1.4H14v2.7h3.3c-.1.8-.6 1.5-1.3 2v1.6h2.1c1.2-1.1 1.9-2.8 1.9-4.9z" />
            <path fill="#34A853" d="M14 20c1.7 0 3.1-.6 4.1-1.5l-2.1-1.6c-.6.4-1.3.6-2 .6-1.5 0-2.8-1-3.3-2.4H8.5v1.7C9.5 18.7 11.6 20 14 20z" />
            <path fill="#FBBC05" d="M10.7 15.1c-.1-.4-.2-.8-.2-1.1s.1-.8.2-1.1V11.2H8.5c-.4.9-.7 1.8-.7 2.8s.2 1.9.7 2.8l2.2-1.7z" />
            <path fill="#EA4335" d="M14 9.9c.9 0 1.7.3 2.4.9l1.8-1.8C17.1 8 15.7 7.4 14 7.4c-2.4 0-4.5 1.3-5.5 3.3l2.2 1.7c.5-1.4 1.8-2.5 3.3-2.5z" />
          </svg>
        </span>
      );
    case "META":
      return (
        <span className="send-logo send-logo-meta" aria-hidden="true">
          <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#182030" />
            <path fill="#0081FB" d="M18.8 10.5c-1.3 0-2.5.8-3.4 1.9-.3.4-.6.8-.9 1.2-.5-.7-1.1-1.5-1.9-2.1-.9-.7-2-1-3.1-1C7.3 10.5 5.5 12.3 5.5 14.5s1.8 4 4 4c1.3 0 2.5-.6 3.4-1.6.4-.5.8-1 1.1-1.5.5.7 1.1 1.5 1.9 2.1.9.7 2 1 3.1 1 2.2 0 4-1.8 4-4s-1.8-4-4.2-4zm-9.3 6.3c-1.3 0-2.3-1-2.3-2.3s1-2.3 2.3-2.3c.8 0 1.5.4 2 1.1.4.5.8 1.2 1.2 1.8-.9 1.1-2 1.7-3.2 1.7zm9.3 0c-1.2 0-2.3-.6-3.2-1.7.4-.6.8-1.3 1.2-1.8.5-.7 1.2-1.1 2-1.1 1.3 0 2.3 1 2.3 2.3s-1 2.3-2.3 2.3z" />
          </svg>
        </span>
      );
    case "SPY":
      return (
        <span className="send-logo send-logo-spy" aria-hidden="true">
          <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#FFFFFF" />
            <circle cx="14" cy="14" r="12.5" stroke="#167946" strokeWidth="1.5" fill="#f0faf4" />
            <text x="14" y="16.5" textAnchor="middle" fill="#167946" fontSize="7.5" fontFamily="monospace" fontWeight="900" letterSpacing="0.5">SPDR</text>
          </svg>
        </span>
      );
    case "QQQ":
      return (
        <span className="send-logo send-logo-qqq" aria-hidden="true">
          <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#002D72" />
            <path fill="#ffffff" d="M14 7.5L16.2 12.8L21.5 15L16.2 17.2L14 22.5L11.8 17.2L6.5 15L11.8 12.8Z" />
            <circle cx="14" cy="15" r="2.2" fill="#002D72" />
          </svg>
        </span>
      );
    default:
      return (
        <span className="send-logo send-logo-blank" aria-hidden="true">
          {symbol.slice(0, 1)}
        </span>
      );
  }
}

function Logo({ stock }: { stock: Stock }) {
  if (stock.logoUrl !== null) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="send-logo" src={stock.logoUrl} alt="" width={28} height={28} loading="lazy" referrerPolicy="no-referrer" />;
  }
  return <StockLogo symbol={stock.symbol} />;
}

function stockCardName(stock: Stock): string {
  const sym = stock.symbol.toUpperCase().replace(/B$/, "");
  if (sym === "SPY") return "SPY";
  if (sym === "QQQ") return "Invesco QQQ";
  if (sym === "AMZN") return "Amazon";
  return displayName(stock.name);
}

function stockBackingSymbol(stock: Stock): string {
  const sym = stock.symbol.toUpperCase();
  return sym.endsWith("B") ? sym : `${sym}B`;
}

function Check() {
  return (
    <svg className="send-tile-check" viewBox="0 0 14 14" width={14} height={14} aria-hidden="true" focusable="false">
      <path d="M2.5 7.5 L5.6 10.5 L11.5 3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StockPicker({
  state,
  selected,
  onSelect,
  onReload,
}: {
  state: StocksState;
  selected: string | null;
  onSelect: (address: string) => void;
  onReload: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  if (state.status === "loading") {
    return (
      <div className="send-grid" aria-busy="true" aria-label="Loading stocks">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
          <span className="send-tile send-tile-skeleton" key={index} aria-hidden="true" />
        ))}
      </div>
    );
  }
  if (state.status === "failed" || state.stocks.length === 0) {
    return (
      <div className="send-soft">
        <p className="send-note-text">Stocks could not load. Try again in a minute.</p>
        <button type="button" className="send-link" onClick={onReload}>
          Reload
        </button>
      </div>
    );
  }

  const now = new Date();

  const q = searchQuery.trim().toLowerCase();
  const visibleStocks = state.stocks.filter((stock) => {
    if (!q) return true;
    return (
      stock.symbol.toLowerCase().includes(q) ||
      stock.name.toLowerCase().includes(q) ||
      stockCardName(stock).toLowerCase().includes(q) ||
      displayName(stock.name).toLowerCase().includes(q)
    );
  });

  return (
    <div className="send-picker-container">
      <div className="send-picker-top sr-only">
        <h2 className="send-picker-title">Stocks</h2>
        <span className="send-picker-count">{state.stocks.length} available</span>
      </div>

      <div className="send-search-row sr-only">
        <input
          type="text"
          className="send-search-input"
          placeholder="Search 9 leading stocks (e.g. NVDA, Apple, Tesla)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search stocks"
        />
      </div>

      <div className="send-grid" role="group" aria-label="Stock">
        {visibleStocks.length === 0 ? (
          <p className="send-empty-search">No matching stocks found.</p>
        ) : (
          visibleStocks.map((stock) => {
            const open = isTradable(stock);
            const picked = selected === stock.address;
            return (
              <button
                type="button"
                className="send-tile"
                key={stock.address}
                disabled={!open}
                aria-pressed={picked}
                data-selected={picked ? "true" : undefined}
                data-closed={open ? undefined : "true"}
                onClick={() => onSelect(stock.address)}
              >
                <Logo stock={stock} />
                <span className="send-tile-text">
                  <span className="send-tile-name-row">
                    <span className="send-tile-name">{stockCardName(stock)}</span>
                  </span>
                  <span className="send-tile-symbol">{stockBackingSymbol(stock)}</span>
                  {open ? null : <span className="send-tile-opens">{opensText(stock.market.nextOpenTime, now)}</span>}
                </span>
                <span className="send-tile-price">{stock.priceUsd === null ? "" : `$${usd(stock.priceUsd)}`}</span>
                {picked ? <Check /> : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
