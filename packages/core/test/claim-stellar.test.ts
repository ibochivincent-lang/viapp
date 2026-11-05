import { describe, expect, it } from "vitest";
import { handleClaim } from "../src/claim.js";
import { Keypair } from "@stellar/stellar-sdk";

describe("Stellar Sponsored Claiming", () => {
  const recipientKey = Keypair.random();
  const mockDeps = {} as any;

  it("handles a valid stellar claim request successfully", async () => {
    const res = await handleClaim(mockDeps, {
      giftId: "1",
      recipient: recipientKey.publicKey(),
      signature: "0x" + "a".repeat(128),
      declaration: true,
      chain: "stellar",
    }, { country: "DE", region: "DE-BY" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    if (res.body.ok) {
      expect(res.body.txHash).toBeDefined();
      expect(res.body.reused).toBe(false);
    }
  });

  it("rejects an invalid stellar recipient address", async () => {
    const res = await handleClaim(mockDeps, {
      giftId: "1",
      recipient: "NOT_A_STELLAR_KEY",
      signature: "0x" + "a".repeat(128),
      declaration: true,
      chain: "stellar",
    }, { country: "US", region: "US-CA" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    if (!res.body.ok) {
      expect(res.body.error).toBe("bad_recipient");
    }
  });

  it("rejects missing declaration", async () => {
    const res = await handleClaim(mockDeps, {
      giftId: "1",
      recipient: recipientKey.publicKey(),
      signature: "0x" + "a".repeat(128),
      declaration: false as any,
      chain: "stellar",
    }, { country: "US", region: "US-CA" });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });
});
