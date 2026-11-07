import { bytesToHex, getAddress, hashTypedData, hexToBytes, isHex } from "viem";
import { generatePrivateKey, type PrivateKeyAccount, privateKeyToAccount } from "viem/accounts";
import { Keypair, StrKey } from "@stellar/stellar-sdk";

export type SupportedChain = "stellar" | "bnb";

export type ClaimKeyPair = {
  chain: SupportedChain;
  privateKey: string;
  address: string;
};

/**
 * Thrown for any part of a gift link that cannot be trusted. The claim page turns `kind` into its
 * copy: "damaged" means the text is not a well-formed link part (often a chat app cut the link or
 * added a character to it), "invalid" means it is well-formed but wrong.
 */
export class LinkError extends Error {
  readonly kind: "damaged" | "invalid";

  constructor(kind: "damaged" | "invalid", message: string) {
    super(message);
    this.name = "LinkError";
    this.kind = kind;
  }
}

/**
 * Makes a fresh one-time claim key and the address the vault stores for it (C11).
 * Defaults to "bnb" for full backwards-compatibility, or generates a Stellar Ed25519 keypair when "stellar" is passed.
 */
export function newClaimKey(chain: SupportedChain = "bnb"): ClaimKeyPair {
  if (chain === "stellar") {
    const kp = Keypair.random();
    return {
      chain: "stellar",
      privateKey: kp.secret(),
      address: kp.publicKey(),
    };
  }
  const privateKey = parseClaimKey(generatePrivateKey());
  return {
    chain: "bnb",
    privateKey,
    address: privateKeyToAccount(privateKey as `0x${string}`).address,
  };
}

export function newStellarClaimKey(): ClaimKeyPair {
  return newClaimKey("stellar");
}

const CLAIM_KEY_HEX_TEXT = /^(?:0[xX])?([0-9a-fA-F]{64})$/;
const STELLAR_SECRET_TEXT = /^S[A-Z2-7]{55}$/;

/**
 * The one parser for a claim key (standard 2). Supports:
 * 1. Stellar Ed25519 secret seed (starts with S, 56 characters base32)
 * 2. BNB / EVM secp256k1 private key (64 hex characters with optional 0x)
 */
export function parseClaimKey(input: string): string {
  if (typeof input !== "string") {
    throw new LinkError("damaged", "The claim key in this gift link is damaged.");
  }
  if (STELLAR_SECRET_TEXT.test(input) && StrKey.isValidEd25519SecretSeed(input)) {
    return input;
  }
  const match = CLAIM_KEY_HEX_TEXT.exec(input);
  const hex = match?.[1];
  if (hex === undefined) throw new LinkError("damaged", "The claim key in this gift link is damaged.");
  return `0x${hex.toLowerCase()}`;
}

export function detectChain(claimKey: string): SupportedChain {
  const parsed = parseClaimKey(claimKey);
  return parsed.startsWith("S") ? "stellar" : "bnb";
}

// 2^256 - 1 has 78 digits, so the length bound keeps BigInt away from huge strings. It cannot
// tell 2^256 from 2^256 - 1 (both have 78 digits); the comparison below does that.
const GIFT_ID_TEXT = /^[1-9][0-9]{0,77}$/;
const UINT256_LIMIT = 1n << 256n;

/**
 * The one parser for a gift id (standard 2), for the claim page, every API route and every store
 * key. Accepts only the canonical decimal form of a whole number from 1 to 2^256 - 1. Throws
 * LinkError "damaged" for an empty string, zero, a leading zero, a sign, hex, a decimal point, an
 * exponent, a space, a value of 2^256 or more, or a non-string. Because only one spelling of each
 * number is accepted, "01" and "1" can never reach two different records.
 */
export function parseGiftId(input: string): bigint {
  if (typeof input !== "string" || !GIFT_ID_TEXT.test(input)) {
    throw new LinkError("damaged", "The gift number in this link is damaged.");
  }
  const id = BigInt(input);
  if (id >= UINT256_LIMIT) throw new LinkError("damaged", "The gift number in this link is damaged.");
  return id;
}

// Far longer than any real link (an origin, /g/, 78 digits, # and 66 characters of key). The cap
// keeps an oversized paste away from the URL parser.
const MAX_LINK_LENGTH = 2048;
const GIFT_PATH = /^\/g\/(?:(stellar|bnb)\/)?([^/]*)$/;

// Plain http is allowed only for localhost, which browsers treat as a secure context, so Web Crypto
// works there during development. The scheme and host come from the standard URL parser, never
// from a prefix match on the raw text.
function hasAllowedScheme(url: URL): boolean {
  if (url.protocol === "https:") return true;
  return url.protocol === "http:" && url.hostname === "localhost";
}

// Gift ids arrive here as bigints from code, not text from a link, but they still go through
// parseGiftId so the range rule lives in one place.
function checkGiftId(giftId: bigint): bigint {
  return parseGiftId(typeof giftId === "bigint" ? giftId.toString() : "");
}

/**
 * Builds the gift link:
 * - Stellar: `${origin}/g/stellar/${giftId}#${claimKey}`
 * - BNB: `${origin}/g/${giftId}#${key}` or `${origin}/g/bnb/${giftId}#${key}`
 */
export function buildLink(
  origin: string,
  giftId: bigint,
  claimKey: string,
  chain?: SupportedChain,
): string {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new LinkError("damaged", "The site address for gift links is not a valid URL.");
  }
  if (!hasAllowedScheme(url)) {
    throw new LinkError("invalid", "Gift links must use https, or http://localhost in development.");
  }
  // The URL getters report an empty "?" or "#" as "", so comparing with the parser's own rebuilt
  // form is what catches every extra part in one check.
  if (url.href !== `${url.origin}/`) {
    throw new LinkError("invalid", "The site address for gift links must be an origin only, with no path, query or fragment.");
  }
  const id = checkGiftId(giftId);
  const key = parseClaimKey(claimKey);
  const determinedChain = chain ?? (key.startsWith("S") ? "stellar" : "bnb");

  let link: string;
  if (determinedChain === "stellar") {
    link = `${url.origin}/g/stellar/${id}#${key}`;
  } else if (chain === "bnb") {
    link = `${url.origin}/g/bnb/${id}#${key.startsWith("0x") ? key.slice(2) : key}`;
  } else {
    link = `${url.origin}/g/${id}#${key.startsWith("0x") ? key.slice(2) : key}`;
  }
  const check = parseLink(link);
  if (check.giftId !== id || check.claimKey !== key || check.origin !== url.origin) {
    throw new LinkError("invalid", "The gift link did not read back the way it was built.");
  }
  return link;
}

/**
 * Reads a gift link with the standard URL parser. Supports /g/<id>, /g/stellar/<id>, and /g/bnb/<id>.
 */
export function parseLink(url: string): { origin: string; giftId: bigint; claimKey: string; chain: SupportedChain } {
  if (typeof url !== "string" || url.length > MAX_LINK_LENGTH) {
    throw new LinkError("damaged", "This gift link is damaged.");
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new LinkError("damaged", "This gift link is damaged.");
  }
  if (!hasAllowedScheme(parsed)) {
    throw new LinkError("invalid", "Gift links must use https.");
  }
  if (parsed.hash === "") {
    throw new LinkError("damaged", "This gift link is missing its claim key.");
  }
  // Only an origin, a path and a fragment may be present. If the parser's own pieces do not
  // rebuild the whole link, something else (a query, even an empty one, or a user name) is there.
  if (parsed.href !== `${parsed.origin}${parsed.pathname}${parsed.hash}`) {
    throw new LinkError("damaged", "This gift link is damaged.");
  }
  const path = GIFT_PATH.exec(parsed.pathname);
  if (path === null) {
    throw new LinkError("damaged", "This is not a gift link.");
  }
  const explicitChain = path[1] as SupportedChain | undefined;
  const rawId = path[2] ?? "";
  const giftId = parseGiftId(rawId);
  const claimKey = parseClaimKey(parsed.hash.slice(1));
  const chain = explicitChain ?? (claimKey.startsWith("S") ? "stellar" : "bnb");

  const res = {
    origin: parsed.origin,
    giftId,
    claimKey,
  } as { origin: string; giftId: bigint; claimKey: string; chain: SupportedChain };

  Object.defineProperty(res, "chain", {
    value: chain,
    enumerable: false,
    writable: true,
    configurable: true,
  });

  return res;
}

/** EIP-712 types for Claim(uint256 giftId,address recipient), the message the vault verifies. */
export const CLAIM_TYPES = {
  Claim: [
    { name: "giftId", type: "uint256" },
    { name: "recipient", type: "address" },
  ],
} as const;

/**
 * The EIP-712 domain the vault checks: name "Moi", version "1", the chain id and the vault
 * address. Binding both stops a signature for one vault or one chain from working on another (C2).
 * Throws on a chain id that is not a positive whole number and on an address getAddress refuses.
 */
export function claimDomain(
  vault: `0x${string}`,
  chainId: number,
): { name: "Moi"; version: "1"; chainId: number; verifyingContract: `0x${string}` } {
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new Error("chainId must be a positive whole number.");
  }
  return { name: "Moi", version: "1", chainId, verifyingContract: getAddress(vault) };
}

// Built in one place so the digest and the signature can never be over different data.
function claimTypedData(vault: `0x${string}`, chainId: number, giftId: bigint, recipient: `0x${string}`) {
  return {
    domain: claimDomain(vault, chainId),
    types: CLAIM_TYPES,
    primaryType: "Claim" as const,
    message: { giftId: checkGiftId(giftId), recipient: getAddress(recipient) },
  };
}

// Both the address check and signing derive the account here, from the same parsed key
// (standard 2).
function claimAccount(claimKey: string): PrivateKeyAccount {
  const key = parseClaimKey(claimKey);
  try {
    return privateKeyToAccount(key);
  } catch {
    // 64 hex characters can still be zero or above the curve order. newClaimKey never makes one,
    // so only a crafted link carries it.
    throw new LinkError("invalid", "The claim key in this gift link is not a usable key.");
  }
}

/**
 * The EIP-712 digest of Claim(giftId, recipient) under claimDomain(vault, chainId). The vault
 * recovers the claim key's address from a signature over exactly this digest. Throws LinkError
 * "damaged" for a gift id outside 1 to 2^256 - 1, and throws on a bad vault or recipient address
 * or a bad chain id.
 */
export function claimDigest(
  vault: `0x${string}`,
  chainId: number,
  giftId: bigint,
  recipient: `0x${string}`,
): `0x${string}` {
  return hashTypedData(claimTypedData(vault, chainId, giftId, recipient));
}

/**
 * Signs Claim(giftId, recipient) with the claim key and returns the 65-byte signature (r, s, v
 * with v of 27 or 28, low s) that the vault checks. The recipient is normalised with getAddress.
 * Throws LinkError "damaged" for a malformed key or gift id, LinkError "invalid" for a key that is
 * well-formed but cannot sign, and throws on a bad address or chain id.
 */
export async function signClaim(
  claimKey: `0x${string}`,
  vault: `0x${string}`,
  chainId: number,
  giftId: bigint,
  recipient: `0x${string}`,
): Promise<`0x${string}`> {
  const account = claimAccount(claimKey);
  return account.signTypedData(claimTypedData(vault, chainId, giftId, recipient));
}

/**
 * C15: true only when the claim key produces exactly the claim-key address stored on chain for the
 * gift. Supports both Stellar public keys (G...) and EVM addresses (0x...).
 * Never throws. A malformed or unusable key, a malformed stored address, and the zero address (which
 * no key produces) all give false, so the page shows "not valid".
 */
// WHY synchronous: an async version returns a Promise, which is truthy, so a caller that forgot
// `await` would accept every link. A plain boolean cannot be misread that way.
export function claimKeyMatches(
  claimKey: string,
  storedClaimKeyAddress: string,
): boolean {
  try {
    const key = parseClaimKey(claimKey);
    if (key.startsWith("S")) {
      const kp = Keypair.fromSecret(key);
      return kp.publicKey() === storedClaimKeyAddress;
    }
    return getAddress(claimAccount(key).address) === getAddress(storedClaimKeyAddress);
  } catch {
    return false;
  }
}

/** EIP-712 types for RegisterGift(address sender), the key proof the vault's createGift checks (C32). */
export const REGISTER_TYPES = { RegisterGift: [{ name: "sender", type: "address" }] } as const;

// Built in one place so the digest and the proof can never be over different data.
function registerTypedData(vault: `0x${string}`, chainId: number, sender: `0x${string}`) {
  return {
    domain: claimDomain(vault, chainId),
    types: REGISTER_TYPES,
    primaryType: "RegisterGift" as const,
    message: { sender: getAddress(sender) },
  };
}

/**
 * The EIP-712 digest of RegisterGift(sender) under claimDomain(vault, chainId), the same value as
 * the vault's registerDigest(sender). Throws on a bad vault or sender address or a bad chain id.
 */
export function registerDigest(vault: `0x${string}`, chainId: number, sender: `0x${string}`): `0x${string}` {
  return hashTypedData(registerTypedData(vault, chainId, sender));
}

/**
 * Signs RegisterGift(sender) with the claim key and returns the 65-byte proof (r, s, v with v of
 * 27 or 28, low s) that createGift takes as keyProof. `sender` must be the address that will send
 * createGift, normalised here with getAddress: the vault recovers the proof against msg.sender, so
 * a copy of the transaction sent from any other address fails BadKeyProof (C32). Throws LinkError
 * "damaged" for a malformed key, LinkError "invalid" for a key that cannot sign, and throws on a
 * bad address or chain id.
 */
export async function signKeyProof(
  claimKey: string,
  vault: `0x${string}`,
  chainId: number,
  sender: `0x${string}`,
): Promise<`0x${string}`> {
  const account = claimAccount(claimKey);
  return account.signTypedData(registerTypedData(vault, chainId, sender));
}

/**
 * SHA-256 digest of a Stellar key registration proof over:
 * "viapp:register:" + sha256(networkPassphrase) + vaultContractId + sender
 * Exactly matches Soroban contract logic in lib.rs.
 */
export async function stellarRegisterDigest(
  vaultContractId: string,
  networkPassphrase: string,
  sender: string,
): Promise<Uint8Array> {
  const subtle = subtleCrypto();
  const networkHash = new Uint8Array(await subtle.digest("SHA-256", new TextEncoder().encode(networkPassphrase)));
  const prefix = new TextEncoder().encode("viapp:register:");
  const vaultBytes = new TextEncoder().encode(vaultContractId);
  const senderBytes = new TextEncoder().encode(sender);

  const combined = new Uint8Array(prefix.length + networkHash.length + vaultBytes.length + senderBytes.length);
  let offset = 0;
  combined.set(prefix, offset); offset += prefix.length;
  combined.set(networkHash, offset); offset += networkHash.length;
  combined.set(vaultBytes, offset); offset += vaultBytes.length;
  combined.set(senderBytes, offset);

  return new Uint8Array(await subtle.digest("SHA-256", combined));
}

/**
 * Signs a Stellar key registration proof with the Ed25519 claim secret.
 * Returns 64-byte signature encoded as lowercase hex without 0x.
 */
export async function stellarSignKeyProof(
  claimKey: string,
  vaultContractId: string,
  networkPassphrase: string,
  sender: string,
): Promise<string> {
  const key = parseClaimKey(claimKey);
  if (!key.startsWith("S")) {
    throw new LinkError("invalid", "Expected a Stellar claim key.");
  }
  const keypair = Keypair.fromSecret(key);
  const digest = await stellarRegisterDigest(vaultContractId, networkPassphrase, sender);
  const sigBuffer = keypair.sign(Buffer.from(digest));
  return Buffer.from(sigBuffer).toString("hex");
}

/**
 * Verifies a Stellar key registration proof.
 */
export async function stellarVerifyKeyProof(
  claimPublicKey: string,
  vaultContractId: string,
  networkPassphrase: string,
  sender: string,
  proofHex: string,
): Promise<boolean> {
  try {
    const keypair = Keypair.fromPublicKey(claimPublicKey);
    const digest = await stellarRegisterDigest(vaultContractId, networkPassphrase, sender);
    const sigBuffer = Buffer.from(proofHex, "hex");
    return keypair.verify(Buffer.from(digest), sigBuffer);
  } catch {
    return false;
  }
}

/**
 * SHA-256 digest of a Stellar claim message over:
 * "viapp:claim:" + sha256(networkPassphrase) + vaultContractId + giftId (8 bytes BE) + recipient
 * Exactly matches Soroban contract logic in lib.rs.
 */
export async function stellarClaimDigest(
  vaultContractId: string,
  networkPassphrase: string,
  giftId: bigint,
  recipient: string,
): Promise<Uint8Array> {
  const subtle = subtleCrypto();
  const networkHash = new Uint8Array(await subtle.digest("SHA-256", new TextEncoder().encode(networkPassphrase)));
  const prefix = new TextEncoder().encode("viapp:claim:");
  const vaultBytes = new TextEncoder().encode(vaultContractId);

  const idBuf = new Uint8Array(8);
  const view = new DataView(idBuf.buffer);
  view.setBigUint64(0, checkGiftId(giftId), false); // Big Endian

  const recipientBytes = new TextEncoder().encode(recipient);

  const combined = new Uint8Array(prefix.length + networkHash.length + vaultBytes.length + idBuf.length + recipientBytes.length);
  let offset = 0;
  combined.set(prefix, offset); offset += prefix.length;
  combined.set(networkHash, offset); offset += networkHash.length;
  combined.set(vaultBytes, offset); offset += vaultBytes.length;
  combined.set(idBuf, offset); offset += idBuf.length;
  combined.set(recipientBytes, offset);

  return new Uint8Array(await subtle.digest("SHA-256", combined));
}

/**
 * Signs a Stellar claim message with the Ed25519 claim secret.
 * Returns 64-byte signature encoded as lowercase hex without 0x.
 */
export async function stellarSignClaim(
  claimKey: string,
  vaultContractId: string,
  networkPassphrase: string,
  giftId: bigint,
  recipient: string,
): Promise<string> {
  const key = parseClaimKey(claimKey);
  if (!key.startsWith("S")) {
    throw new LinkError("invalid", "Expected a Stellar claim key.");
  }
  const keypair = Keypair.fromSecret(key);
  const digest = await stellarClaimDigest(vaultContractId, networkPassphrase, giftId, recipient);
  const sigBuffer = keypair.sign(Buffer.from(digest));
  return Buffer.from(sigBuffer).toString("hex");
}

/**
 * Verifies a Stellar claim signature with the public Ed25519 key.
 */
export async function stellarVerifyClaim(
  claimPublicKey: string,
  vaultContractId: string,
  networkPassphrase: string,
  giftId: bigint,
  recipient: string,
  signatureHex: string,
): Promise<boolean> {
  try {
    const keypair = Keypair.fromPublicKey(claimPublicKey);
    const digest = await stellarClaimDigest(vaultContractId, networkPassphrase, giftId, recipient);
    const sigBuffer = Buffer.from(signatureHex, "hex");
    return keypair.verify(Buffer.from(digest), sigBuffer);
  } catch {
    return false;
  }
}

const NOTE_VERSION = 0x01;
const NOTE_IV_BYTES = 12;
const NOTE_TAG_BYTES = 16;
const NOTE_OVERHEAD_BYTES = 1 + NOTE_IV_BYTES + NOTE_TAG_BYTES;

/** The largest sealed note in bytes, matching the vault's note cap (C3). */
export const MAX_NOTE_BYTES = 512;
/** The largest note text in UTF-8 bytes: 512 minus 1 version byte, a 12-byte IV and a 16-byte tag. */
export const MAX_NOTE_PLAINTEXT_BYTES = MAX_NOTE_BYTES - NOTE_OVERHEAD_BYTES;

const NOTE_SALT = new TextEncoder().encode("moi-note-v1");
const NOTE_INFO = new TextEncoder().encode("note");

// Web Crypto through globalThis keeps this file identical in the browser and in Node. Browsers
// only offer crypto.subtle on https and localhost pages, so its absence fails closed here.
function subtleCrypto() {
  const subtle = globalThis.crypto?.subtle;
  if (subtle === undefined) throw new Error("Web Crypto is not available here, so the note cannot be sealed or opened.");
  return subtle;
}

async function noteKey(claimKey: string) {
  const subtle = subtleCrypto();
  const key = parseClaimKey(claimKey);
  let rawBytes: Uint8Array;
  if (key.startsWith("S")) {
    rawBytes = StrKey.decodeEd25519SecretSeed(key);
  } else {
    rawBytes = Uint8Array.from(hexToBytes(key as `0x${string}`));
  }
  const base = await subtle.importKey("raw", rawBytes as BufferSource, "HKDF", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: NOTE_SALT, info: NOTE_INFO },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Seals the sender's note so only someone holding the link can read it (C9); only this output
 * goes on chain. The AES-256-GCM key comes from HKDF-SHA256 over the 32 claim-key bytes with salt
 * "moi-note-v1" and info "note", and every seal uses a fresh 12-byte IV from
 * crypto.getRandomValues. Output is hex of [0x01][IV][ciphertext and 16-byte tag], at most
 * MAX_NOTE_BYTES. An empty note seals to "0x". Throws LinkError "damaged" for a malformed key and
 * RangeError when the UTF-8 text is longer than MAX_NOTE_PLAINTEXT_BYTES.
 */
export async function sealNote(claimKey: string, plaintext: string): Promise<`0x${string}`> {
  const key = parseClaimKey(claimKey);
  if (typeof plaintext !== "string") throw new TypeError("The note must be text.");
  const text = new TextEncoder().encode(plaintext);
  if (text.length > MAX_NOTE_PLAINTEXT_BYTES) {
    throw new RangeError(`The note is ${text.length} bytes; the limit is ${MAX_NOTE_PLAINTEXT_BYTES} bytes.`);
  }
  if (text.length === 0) return "0x";
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(NOTE_IV_BYTES));
  const sealed = new Uint8Array(await subtleCrypto().encrypt({ name: "AES-GCM", iv }, await noteKey(key), text));
  const out = new Uint8Array(1 + NOTE_IV_BYTES + sealed.length);
  out[0] = NOTE_VERSION;
  out.set(iv, 1);
  out.set(sealed, 1 + NOTE_IV_BYTES);
  return bytesToHex(out);
}

/**
 * Opens a note made by sealNote. "0x" opens to "". Fails closed: it returns the whole note or
 * throws, never part of one. Throws LinkError "damaged" for a malformed key and LinkError
 * "invalid" for text that is not even-length hex, a blob shorter than one sealed byte or longer
 * than MAX_NOTE_BYTES, a version byte other than 0x01, a wrong key, any changed byte, or bytes
 * that are not valid UTF-8. The returned text is the sender's own words and must be rendered as
 * plain text only (C14).
 */
export async function openNote(claimKey: string, sealed: `0x${string}`): Promise<string> {
  const key = parseClaimKey(claimKey);
  if (sealed === "0x") return "";
  if (
    typeof sealed !== "string" ||
    sealed.length > 2 + 2 * MAX_NOTE_BYTES ||
    sealed.length % 2 !== 0 ||
    !isHex(sealed, { strict: true })
  ) {
    throw new LinkError("invalid", "The note on this gift is not readable.");
  }
  const bytes = hexToBytes(sealed);
  // sealNote never seals an empty note into a blob, so a blob must hold at least one note byte.
  if (bytes.length < NOTE_OVERHEAD_BYTES + 1 || bytes[0] !== NOTE_VERSION) {
    throw new LinkError("invalid", "The note on this gift is not readable.");
  }
  let opened: ArrayBuffer;
  try {
    opened = await subtleCrypto().decrypt(
      { name: "AES-GCM", iv: bytes.slice(1, 1 + NOTE_IV_BYTES) },
      await noteKey(key),
      bytes.slice(1 + NOTE_IV_BYTES),
    );
  } catch {
    throw new LinkError("invalid", "The note on this gift could not be opened with this link.");
  }
  try {
    // ignoreBOM keeps a leading U+FEFF that the sender typed, so the text round-trips exactly.
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(opened);
  } catch {
    throw new LinkError("invalid", "The note on this gift is not readable.");
  }
}
