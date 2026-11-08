import {
  Account,
  Keypair,
  Operation,
  TimeoutInfinite,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import crypto from "node:crypto";

export interface Sep10ChallengeParams {
  serverKeypair: Keypair;
  clientPublicKey: string;
  networkPassphrase: string;
  homeDomain: string;
  timeoutSeconds?: number;
}

export interface Sep10VerificationResult {
  valid: boolean;
  clientPublicKey: string;
  homeDomain: string;
  error?: string;
}

/**
 * Builds an authentic SEP-0010 Web Authentication Challenge Transaction.
 * Follows the official SEP-10 specification:
 * - Source account: server signing key
 * - Sequence number: 0
 * - Timebounds: valid within a narrow window (default 300s)
 * - Operation: ManageData with key `<homeDomain> auth` and a 48-byte random nonce
 * - Signed by the server
 */
export function buildSep10Challenge(params: Sep10ChallengeParams): string {
  const {
    serverKeypair,
    clientPublicKey,
    networkPassphrase,
    homeDomain,
    timeoutSeconds = 300,
  } = params;

  // SEP-10 requires sequence number = 0
  const serverAccount = new Account(serverKeypair.publicKey(), "-1");

  const now = Math.floor(Date.now() / 1000);
  const minTime = now - 60; // 60s leeway for clock drift
  const maxTime = now + timeoutSeconds;

  // 48-byte random cryptographic nonce
  const nonce = crypto.randomBytes(48);

  const txBuilder = new TransactionBuilder(serverAccount, {
    fee: "100",
    networkPassphrase,
    timebounds: {
      minTime,
      maxTime,
    },
  });

  // Op 1: manageData with homeDomain auth and nonce
  txBuilder.addOperation(
    Operation.manageData({
      name: `${homeDomain} auth`,
      value: nonce,
      source: clientPublicKey,
    }),
  );

  const tx = txBuilder.build();
  tx.sign(serverKeypair);

  return tx.toEnvelope().toXDR("base64");
}

/**
 * Verifies a SEP-0010 Challenge Transaction signed by the client.
 */
export function verifySep10Challenge(
  challengeXdr: string,
  serverPublicKey: string,
  expectedHomeDomain: string,
  networkPassphrase: string,
  currentTimeSec?: number,
): Sep10VerificationResult {
  try {
    const tx = new Transaction(challengeXdr, networkPassphrase);

    // 1. Validate sequence number is "0"
    if (tx.sequence !== "0") {
      return { valid: false, clientPublicKey: "", homeDomain: "", error: "Invalid sequence number: must be 0" };
    }

    // 2. Validate source account matches server public key
    if (tx.source !== serverPublicKey) {
      return { valid: false, clientPublicKey: "", homeDomain: "", error: "Source account does not match server key" };
    }

    // 3. Validate timebounds
    const now = currentTimeSec ?? Math.floor(Date.now() / 1000);
    if (!tx.timeBounds) {
      return { valid: false, clientPublicKey: "", homeDomain: "", error: "Missing timebounds" };
    }
    const minTime = parseInt(tx.timeBounds.minTime, 10);
    const maxTime = parseInt(tx.timeBounds.maxTime, 10);
    if (now < minTime || now > maxTime) {
      return { valid: false, clientPublicKey: "", homeDomain: "", error: "Challenge expired or not yet valid" };
    }

    // 4. Validate operation
    if (tx.operations.length === 0) {
      return { valid: false, clientPublicKey: "", homeDomain: "", error: "No operations found in challenge" };
    }
    const op = tx.operations[0] as Operation.ManageData;
    if (op.type !== "manageData") {
      return { valid: false, clientPublicKey: "", homeDomain: "", error: "First operation must be manageData" };
    }
    if (op.name !== `${expectedHomeDomain} auth`) {
      return { valid: false, clientPublicKey: "", homeDomain: "", error: `Operation name must be '${expectedHomeDomain} auth'` };
    }
    if (!op.value || op.value.length !== 48) {
      return { valid: false, clientPublicKey: "", homeDomain: "", error: "Operation value must be a 48-byte nonce" };
    }
    if (!op.source) {
      return { valid: false, clientPublicKey: "", homeDomain: "", error: "Operation source (client) is missing" };
    }

    const clientPublicKey = op.source;

    // 5. Verify server signature
    const serverSigned = tx.signatures.some((sig) => {
      const serverKey = Keypair.fromPublicKey(serverPublicKey);
      return serverKey.verify(tx.hash(), sig.signature());
    });
    if (!serverSigned) {
      return { valid: false, clientPublicKey, homeDomain: expectedHomeDomain, error: "Server signature is missing or invalid" };
    }

    // 6. Verify client signature
    const clientKey = Keypair.fromPublicKey(clientPublicKey);
    const clientSigned = tx.signatures.some((sig) => clientKey.verify(tx.hash(), sig.signature()));
    if (!clientSigned) {
      return { valid: false, clientPublicKey, homeDomain: expectedHomeDomain, error: "Client signature is missing or invalid" };
    }

    return {
      valid: true,
      clientPublicKey,
      homeDomain: expectedHomeDomain,
    };
  } catch (err: any) {
    return {
      valid: false,
      clientPublicKey: "",
      homeDomain: expectedHomeDomain,
      error: err.message ?? "Unknown verification error",
    };
  }
}

