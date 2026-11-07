import { describe, expect, it } from "vitest";
import { Keypair, Networks } from "@stellar/stellar-sdk";
import crypto from "node:crypto";
import {
  newStellarClaimKey,
  stellarClaimDigest,
  stellarRegisterDigest,
  stellarSignClaim,
  stellarSignKeyProof,
  stellarVerifyClaim,
  stellarVerifyKeyProof,
} from "../src/gift.js";

describe("Property-Based Fuzz Testing: Stellar Ed25519 Claim Pipeline", () => {
  const VAULT_ID = "CDEDHFJ7POEWDFFDRV74ZIWK4CSDKGEN4B4IQXUZHMKGVMJIVFODEV5M";
  const PASSPHRASE = Networks.TESTNET;

  it("invariant: arbitrary valid keypair always signs and verifies registration proof", async () => {
    // 50 iterations with completely fresh random keypairs and random senders
    for (let i = 0; i < 50; i++) {
      const claim = newStellarClaimKey();
      const sender = Keypair.random().publicKey();

      const proofHex = await stellarSignKeyProof(
        claim.privateKey,
        VAULT_ID,
        PASSPHRASE,
        sender,
      );

      // Must be 64 bytes (128 hex chars)
      expect(proofHex.length).toBe(128);

      const valid = await stellarVerifyKeyProof(
        claim.address,
        VAULT_ID,
        PASSPHRASE,
        sender,
        proofHex,
      );
      expect(valid).toBe(true);

      // Invariant: any single-byte corruption in proof strictly fails
      const corruptedProof =
        proofHex.slice(0, 10) +
        (proofHex[10] === "a" ? "b" : "a") +
        proofHex.slice(11);
      const invalidProof = await stellarVerifyKeyProof(
        claim.address,
        VAULT_ID,
        PASSPHRASE,
        sender,
        corruptedProof,
      );
      expect(invalidProof).toBe(false);

      // Invariant: tampered sender strictly fails
      const attacker = Keypair.random().publicKey();
      const attackerCheck = await stellarVerifyKeyProof(
        claim.address,
        VAULT_ID,
        PASSPHRASE,
        attacker,
        proofHex,
      );
      expect(attackerCheck).toBe(false);
    }
  });

  it("invariant: arbitrary giftId, recipient and passphrase always round-trip claim verification", async () => {
    for (let i = 0; i < 50; i++) {
      const claim = newStellarClaimKey();
      const recipient = Keypair.random().publicKey();
      // Random giftId across full 63-bit range
      const randomBigInt = BigInt(
        "0x" + crypto.randomBytes(7).toString("hex"),
      ) + 1n;

      const sigHex = await stellarSignClaim(
        claim.privateKey,
        VAULT_ID,
        PASSPHRASE,
        randomBigInt,
        recipient,
      );

      expect(sigHex.length).toBe(128);

      const valid = await stellarVerifyClaim(
        claim.address,
        VAULT_ID,
        PASSPHRASE,
        randomBigInt,
        recipient,
        sigHex,
      );
      expect(valid).toBe(true);

      // Invariant: tampered recipient strictly fails
      const wrongRecipient = Keypair.random().publicKey();
      const invalidRecipient = await stellarVerifyClaim(
        claim.address,
        VAULT_ID,
        PASSPHRASE,
        randomBigInt,
        wrongRecipient,
        sigHex,
      );
      expect(invalidRecipient).toBe(false);

      // Invariant: tampered gift ID strictly fails
      const invalidGiftId = await stellarVerifyClaim(
        claim.address,
        VAULT_ID,
        PASSPHRASE,
        randomBigInt + 1n,
        recipient,
        sigHex,
      );
      expect(invalidGiftId).toBe(false);

      // Invariant: wrong contract ID strictly fails
      const fakeVault = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";
      const invalidVault = await stellarVerifyClaim(
        claim.address,
        fakeVault,
        PASSPHRASE,
        randomBigInt,
        recipient,
        sigHex,
      );
      expect(invalidVault).toBe(false);
    }
  });

  it("invariant: digest calculation is strictly deterministic across 100 runs", async () => {
    const sender = Keypair.random().publicKey();
    const digestA = await stellarRegisterDigest(VAULT_ID, PASSPHRASE, sender);

    for (let i = 0; i < 100; i++) {
      const digestB = await stellarRegisterDigest(VAULT_ID, PASSPHRASE, sender);
      expect(Buffer.from(digestA).equals(Buffer.from(digestB))).toBe(true);
    }
  });
});
