"use client";

import { useState } from "react";
import { displayName, type Stock, type StocksState } from "@/lib/stocks";
import { opensText, usd } from "./format";

/** True unless the market is known to be closed. Checks live market status and quotes. */
export function isTradable(stock: Stock): boolean {
  return stock.market.open !== false;
}

function Logo({ stock }: { stock: Stock }) {
  // A plain img on purpose: the address was already checked to be https.
  return stock.logoUrl === null ? (
    <span className="send-logo send-logo-blank" aria-hidden="true">
      {stock.symbol.slice(0, 1)}
    </span>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="send-logo" src={stock.logoUrl} alt="" width={28} height={28} loading="lazy" referrerPolicy="no-referrer" />
  );
}

function Check() {
  return (
    <svg className="send-tile-check" viewBox="0 0 14 14" width={14} height={14} aria-hidden="true" focusable="false">
      <path d="M2.5 7.5 L5.6 10.5 L11.5 3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VenueBadge({ venue, symbol }: { venue?: "bnb" | "okx" | "stellar"; symbol?: string }) {
  const norm = (symbol ?? "").replace(/[BX]$/i, "").toUpperCase();
  const isDual = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "GOOGL", "META"].includes(norm);

  if (venue === "okx") {
    return (
      <span className="send-badge-venue send-badge-okx" title={isDual ? "OKX X Layer · Automatically fails over to BNB bStocks" : "OKX X Layer"}>
        OKX L2{isDual ? " · Dual" : ""}
      </span>
    );
  }
  if (venue === "bnb") {
    return (
      <span className="send-badge-venue send-badge-bnb" title={isDual ? "BNB bStock · Automatically fails over to OKX xStocks" : "BNB bStock"}>
        bStock{isDual ? " · Dual" : ""}
      </span>
    );
  }
  return <span className="send-badge-venue send-badge-stellar">Stellar</span>;
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
  const [filterVenue, setFilterVenue] = useState<"all" | "bnb" | "okx" | "stellar">("all");

  if (state.status === "loading") {
    return (
      <div className="send-grid" aria-busy="true" aria-label="Loading stocks">
        {[0, 1, 2, 3, 4, 5].map((index) => (
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
  const bnbCount = state.stocks.filter((s) => s.venue === "bnb").length;
  const okxCount = state.stocks.filter((s) => s.venue === "okx").length;
  const stellarCount = state.stocks.filter((s) => s.venue === "stellar" || !s.venue).length;

  const visibleStocks = state.stocks.filter((stock) => {
    if (filterVenue === "all") return true;
    if (filterVenue === "stellar") return stock.venue === "stellar" || !stock.venue;
    return stock.venue === filterVenue;
  });

  return (
    <div className="send-picker-container">
      {/* Venue Switcher Tabs */}
      <div className="send-venue-tabs" role="tablist" aria-label="Filter equities by venue">
        <button
          type="button"
          role="tab"
          aria-selected={filterVenue === "all"}
          className={`send-venue-tab ${filterVenue === "all" ? "send-venue-tab-active" : ""}`}
          onClick={() => setFilterVenue("all")}
        >
          All Equities ({state.stocks.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterVenue === "bnb"}
          className={`send-venue-tab ${filterVenue === "bnb" ? "send-venue-tab-active" : ""}`}
          onClick={() => setFilterVenue("bnb")}
        >
          bStocks · BNB ({bnbCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterVenue === "okx"}
          className={`send-venue-tab ${filterVenue === "okx" ? "send-venue-tab-active" : ""}`}
          onClick={() => setFilterVenue("okx")}
        >
          xStocks · OKX ({okxCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterVenue === "stellar"}
          className={`send-venue-tab ${filterVenue === "stellar" ? "send-venue-tab-active" : ""}`}
          onClick={() => setFilterVenue("stellar")}
        >
          Stellar Direct ({stellarCount})
        </button>
      </div>

      <div className="send-grid" role="group" aria-label="Stock">
        {visibleStocks.map((stock) => {
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
                  <span className="send-tile-name">{displayName(stock.name)}</span>
                  <VenueBadge venue={stock.venue} symbol={stock.symbol} />
                </span>
                <span className="send-tile-symbol">{stock.symbol}</span>
                {open ? null : <span className="send-tile-opens">{opensText(stock.market.nextOpenTime, now)}</span>}
              </span>
              <span className="send-tile-price">{stock.priceUsd === null ? "" : `$${usd(stock.priceUsd)}`}</span>
              {picked ? <Check /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
