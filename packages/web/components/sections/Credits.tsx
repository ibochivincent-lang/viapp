"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { Grain } from "@/components/hero/Grain";
import { VMark } from "@/components/hero/VMark";
import { VAULT } from "@/lib/chain";
import { addressUrl, shortHex, sourceUrl } from "@/lib/proof";
import "./sections.css";

// The root layout loads Fraunces upright only, so the italic cut is loaded here, as the hero does.
const displayItalic = {
  style: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontStyle: "italic",
  },
};

const GITHUB_URL = "https://github.com/ibochivincent-lang/viapp";
const RISE_PIXELS = 24;
const RISE_SECONDS = 0.6;
const RISE_STAGGER_SECONDS = 0.08;

type Credit = { role: string; name: ReactNode };

const vaultName = (
  <a className="draw-link" href={addressUrl(VAULT)} target="_blank" rel="noopener noreferrer">
    {`GiftVault, ${shortHex(VAULT)}`}
  </a>
);

const CREDITS: readonly Credit[] = [
  { role: "THE SHARES", name: "Real Tokenized Stocks on Stellar" },
  { role: "THE PRICES", name: "Stellar SDEX & DEX Feeds" },
  { role: "THE TRADE", name: "Soroban Smart Contracts & Bridge" },
  { role: "THE DRY RUN", name: "Soroban RPC Simulation" },
  { role: "THE GIFT WRAP", name: "x402 on Stellar" },
  { role: "THE AGENT", name: "Stellar Agentic Payments" },
  { role: "THE SIGN-IN", name: "viapp Wallet" },
  { role: "THE VAULT", name: vaultName },
  { role: "THE CHAIN", name: "Stellar" },
];

export function Credits() {
  const list = useRef<HTMLDListElement>(null);

  useEffect(() => {
    const element = list.current;
    if (!element) return;
    gsap.registerPlugin(ScrollTrigger);
    const mediaMatcher = gsap.matchMedia();
    mediaMatcher.add("(prefers-reduced-motion: no-preference)", () => {
      const rows = Array.from(element.querySelectorAll<HTMLElement>(".credits-row"));
      gsap.set(rows, { opacity: 0, y: RISE_PIXELS });
      // The batch groups rows that enter together and plays each group in page order.
      ScrollTrigger.batch(rows, {
        start: "top 92%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { opacity: 1, y: 0, duration: RISE_SECONDS, ease: "power3.out", stagger: RISE_STAGGER_SECONDS, clearProps: "opacity,transform" }),
      });
    });
    return () => mediaMatcher.revert();
  }, []);

  return (
    <footer className="credits">
      <div className="credits-column">
        <div className="credits-mark">
          <VMark width={28} />
        </div>
        <p className="credits-viapp">VIAPP</p>
        <p className="credits-tagline" style={{ fontFamily: displayItalic.style.fontFamily }}>
          a gift in one link
        </p>
        <p className="credits-meaning">viapp: the modern stock gifting protocol on Stellar.</p>

        <dl className="credits-list" ref={list}>
          {CREDITS.map((credit) => (
            <div className="credits-row" key={credit.role}>
              <dt className="credits-role">{credit.role}</dt>
              <dd className="credits-name">{credit.name}</dd>
            </div>
          ))}
        </dl>

        <div className="credits-rule" aria-hidden="true" />
        <nav className="credits-links" aria-label="Footer">
          <Link className="draw-link" href="/docs" prefetch={false}>
            Docs
          </Link>
          <a className="draw-link" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a className="draw-link" href={`https://stellar.expert/explorer/public/contract/${VAULT}`} target="_blank" rel="noopener noreferrer">
            Contract on StellarExpert
          </a>
          <a className="draw-link" href={sourceUrl(VAULT)} target="_blank" rel="noopener noreferrer">
            Verified source
          </a>
        </nav>
        <p className="credits-fine">
          Built on Stellar. Not investment advice. Gifts are not available to US persons or in
          restricted regions.
        </p>
      </div>
      <Grain />
    </footer>
  );
}
