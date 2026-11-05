import { describe, expect, it } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import {
  buildLink,
  claimKeyMatches,
  detectChain,
  LinkError,
  newClaimKey,
  newStellarClaimKey,
  openNote,
  parseClaimKey,
  parseLink,
  sealNote,
  stellarClaimDigest,
  stellarRegisterDigest,
  stellarSignClaim,
  stellarSignKeyProof,
  stellarVerifyClaim,
  stellarVerifyKeyProof,
} from "../src/gift.js";

const STELLAR_VAULT = "CC4WZ2QZ24F4W2NUGZ2D27V4F54WZ2QZ24F4W2NUGZ2D27V4F54WZ2QZ";
const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const SENDER_ADDRESS = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const RECIPIENT_ADDRESS = "GDQWIW5T6G25JGX2V6G25JGX2V6G25JGX2V6G25JGX2V6G25JGX2V6G2";
const ORIGIN = "https://viapp.me";

describe("Stellar Claim Key and Link Protocol", () => {
  it("generates a valid Stellar keypair with S... secret and G... public key", () => {
    const key = newStellarClaimKey();
    expect(key.chain).toBe("stellar");
    expect(key.privateKey).toMatch(/^S[A-Z2-7]{55}$/);
    expect(key.address).toMatch(/^G[A-Z2-7]{55}$/);

    const kp = Keypair.fromSecret(key.privateKey);
    expect(kp.publicKey()).toBe(key.address);
  });

  it("detects chain as stellar for S... keys and bnb for 0x... keys", () => {
    const stellarKey = newStellarClaimKey();
    const bnbKey = newClaimKey("bnb");

    expect(detectChain(stellarKey.privateKey)).toBe("stellar");
    expect(detectChain(bnbKey.privateKey)).toBe("bnb");
  });

  it("builds and parses Stellar gift links (/g/stellar/:id#key)", () => {
    const key = newStellarClaimKey();
    const link = buildLink(ORIGIN, 42n, key.privateKey, "stellar");
    expect(link).toBe(`${ORIGIN}/g/stellar/42#${key.privateKey}`);

    const parsed = parseLink(link);
    expect(parsed.origin).toBe(ORIGIN);
    expect(parsed.giftId).toBe(42n);
    expect(parsed.claimKey).toBe(key.privateKey);
    expect(parsed.chain).toBe("stellar");
  });

  it("roundtrips note encryption and decryption using a Stellar Ed25519 claim secret", async () => {
    const key = newStellarClaimKey();
    const note = "Congratulations on your new Apple share on Stellar viapp!";
    const sealed = await sealNote(key.privateKey, note);
    expect(sealed).toMatch(/^0x01[0-9a-f]{24}[0-9a-f]+$/);

    const opened = await openNote(key.privateKey, sealed);
    expect(opened).toBe(note);
  });

  it("refuses to decrypt note with a different Stellar key", async () => {
    const key1 = newStellarClaimKey();
    const key2 = newStellarClaimKey();
    const sealed = await sealNote(key1.privateKey, "Private message");

    await expect(openNote(key2.privateKey, sealed)).rejects.toSatisfy(
      (e: unknown) => e instanceof LinkError && (e as LinkError).kind === "invalid",
    );
  });

  it("validates claimKeyMatches for Stellar public address", () => {
    const key = newStellarClaimKey();
    expect(claimKeyMatches(key.privateKey, key.address)).toBe(true);

    const other = newStellarClaimKey();
    expect(claimKeyMatches(key.privateKey, other.address)).toBe(false);
  });

  it("signs and verifies Stellar key registration proof", async () => {
    const key = newStellarClaimKey();
    const proofHex = await stellarSignKeyProof(
      key.privateKey,
      STELLAR_VAULT,
      TESTNET_PASSPHRASE,
      SENDER_ADDRESS,
    );
    expect(proofHex.length).toBe(128); // 64 bytes hex

    const isValid = await stellarVerifyKeyProof(
      key.address,
      STELLAR_VAULT,
      TESTNET_PASSPHRASE,
      SENDER_ADDRESS,
      proofHex,
    );
    expect(isValid).toBe(true);

    // Fails on tampered sender
    const isTamperedValid = await stellarVerifyKeyProof(
      key.address,
      STELLAR_VAULT,
      TESTNET_PASSPHRASE,
      RECIPIENT_ADDRESS,
      proofHex,
    );
    expect(isTamperedValid).toBe(false);
  });

  it("signs and verifies Stellar claim authorization", async () => {
    const key = newStellarClaimKey();
    const giftId = 101n;
    const claimSigHex = await stellarSignClaim(
      key.privateKey,
      STELLAR_VAULT,
      TESTNET_PASSPHRASE,
      giftId,
      RECIPIENT_ADDRESS,
    );
    expect(claimSigHex.length).toBe(128); // 64 bytes hex

    const isValid = await stellarVerifyClaim(
      key.address,
      STELLAR_VAULT,
      TESTNET_PASSPHRASE,
      giftId,
      RECIPIENT_ADDRESS,
      claimSigHex,
    );
    expect(isValid).toBe(true);

    // Fails on wrong recipient
    const isWrongRecipientValid = await stellarVerifyClaim(
      key.address,
      STELLAR_VAULT,
      TESTNET_PASSPHRASE,
      giftId,
      SENDER_ADDRESS,
      claimSigHex,
    );
    expect(isWrongRecipientValid).toBe(false);
  });
});

