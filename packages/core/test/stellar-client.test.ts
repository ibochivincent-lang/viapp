import { describe, expect, it } from "vitest";
import { Account, Keypair, Networks } from "@stellar/stellar-sdk";
import {
  buildClaimOp,
  buildClaimTx,
  buildCreateGiftOp,
  buildCreateGiftTx,
  buildRefundOp,
  buildRefundTx,
} from "../src/client/stellar.js";

describe("Stellar Soroban Client Transaction Builders", () => {
  const senderKey = Keypair.random();
  const relayerKey = Keypair.random();
  const recipientKey = Keypair.random();
  const tokenKey = Keypair.random();
  const vaultContractId = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";
  const tokenContractId = tokenKey.publicKey();

  const sourceAccount = new Account(senderKey.publicKey(), "100");
  const relayerAccount = new Account(relayerKey.publicKey(), "200");

  it("builds a valid create_gift operation and transaction", () => {
    const claimKey = new Uint8Array(32).fill(1);
    const keyProof = new Uint8Array(64).fill(2);
    const sealedNote = new Uint8Array(16).fill(3);

    const op = buildCreateGiftOp({
      sender: senderKey.publicKey(),
      tokenAddress: tokenContractId,
      amount: 100_0000000n,
      claimKey,
      expiry: 1750000000n,
      sealedNote,
      keyProof,
      vaultContractId,
    });

    expect(op.body().switch().name).toBe("invokeHostFunction");

    const tx = buildCreateGiftTx(
      {
        sender: senderKey.publicKey(),
        tokenAddress: tokenContractId,
        amount: 100_0000000n,
        claimKey,
        expiry: 1750000000n,
        sealedNote,
        keyProof,
        vaultContractId,
      },
      {
        sourceAccount,
        networkPassphrase: Networks.TESTNET,
      },
    );

    expect(tx.operations).toHaveLength(1);
    expect(tx.source).toBe(senderKey.publicKey());
    const xdr = tx.toXDR();
    expect(typeof xdr).toBe("string");
    expect(xdr.length).toBeGreaterThan(50);
  });

  it("builds a valid claim operation and transaction", () => {
    const signature = new Uint8Array(64).fill(9);

    const op = buildClaimOp({
      relayer: relayerKey.publicKey(),
      giftId: 42n,
      recipient: recipientKey.publicKey(),
      signature,
      vaultContractId,
    });

    expect(op.body().switch().name).toBe("invokeHostFunction");

    const tx = buildClaimTx(
      {
        relayer: relayerKey.publicKey(),
        giftId: 42n,
        recipient: recipientKey.publicKey(),
        signature,
        vaultContractId,
      },
      {
        sourceAccount: relayerAccount,
        networkPassphrase: Networks.TESTNET,
      },
    );

    expect(tx.operations).toHaveLength(1);
    expect(tx.source).toBe(relayerKey.publicKey());
    const xdr = tx.toXDR();
    expect(xdr.length).toBeGreaterThan(50);
  });

  it("builds a valid refund operation and transaction", () => {
    const op = buildRefundOp({
      caller: senderKey.publicKey(),
      giftId: 42n,
      vaultContractId,
    });

    expect(op.body().switch().name).toBe("invokeHostFunction");

    const tx = buildRefundTx(
      {
        caller: senderKey.publicKey(),
        giftId: 42n,
        vaultContractId,
      },
      {
        sourceAccount,
        networkPassphrase: Networks.TESTNET,
      },
    );

    expect(tx.operations).toHaveLength(1);
    expect(tx.source).toBe(senderKey.publicKey());
    const xdr = tx.toXDR();
    expect(xdr.length).toBeGreaterThan(50);
  });
});
