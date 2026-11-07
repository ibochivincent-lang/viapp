import {
  Account,
  Address,
  Contract,
  Keypair,
  nativeToScVal,
  Operation,
  TimeoutInfinite,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";

/**
 * Deployed and initialized Soroban GiftVault contract on Stellar Testnet.
 * Explorer: https://stellar.expert/explorer/testnet/contract/CDEDHFJ7POEWDFFDRV74ZIWK4CSDKGEN4B4IQXUZHMKGVMJIVFODEV5M
 */
export const DEFAULT_STELLAR_VAULT_CONTRACT_ID =
  "CDEDHFJ7POEWDFFDRV74ZIWK4CSDKGEN4B4IQXUZHMKGVMJIVFODEV5M";

export interface CreateGiftParams {
  sender: string;
  tokenAddress: string;
  amount: bigint;
  claimKey: Uint8Array;
  expiry: bigint;
  sealedNote: Uint8Array;
  keyProof: Uint8Array;
  vaultContractId: string;
}

export interface ClaimGiftParams {
  relayer: string;
  giftId: bigint;
  recipient: string;
  signature: Uint8Array;
  vaultContractId: string;
}

export interface RefundGiftParams {
  caller: string;
  giftId: bigint;
  vaultContractId: string;
}

/**
 * Builds the Soroban invocation operation for creating a gift in GiftVault.
 */
export function buildCreateGiftOp(params: CreateGiftParams): xdr.Operation {
  const contract = new Contract(params.vaultContractId);
  return contract.call(
    "create_gift",
    nativeToScVal(new Address(params.sender), { type: "address" }),
    nativeToScVal(new Address(params.tokenAddress), { type: "address" }),
    nativeToScVal(params.amount, { type: "i128" }),
    nativeToScVal(params.claimKey, { type: "bytes" }),
    nativeToScVal(params.expiry, { type: "u64" }),
    nativeToScVal(params.sealedNote, { type: "bytes" }),
    nativeToScVal(params.keyProof, { type: "bytes" }),
  );
}

/**
 * Builds the Soroban invocation operation for claiming a gift.
 */
export function buildClaimOp(params: ClaimGiftParams): xdr.Operation {
  const contract = new Contract(params.vaultContractId);
  return contract.call(
    "claim",
    nativeToScVal(params.giftId, { type: "u64" }),
    nativeToScVal(new Address(params.recipient), { type: "address" }),
    nativeToScVal(params.signature, { type: "bytes" }),
  );
}

/**
 * Builds the Soroban invocation operation for refunding an expired gift.
 */
export function buildRefundOp(params: RefundGiftParams): xdr.Operation {
  const contract = new Contract(params.vaultContractId);
  return contract.call(
    "refund",
    nativeToScVal(params.giftId, { type: "u64" }),
  );
}

export interface BuildTxOptions {
  sourceAccount: Account;
  networkPassphrase: string;
  baseFee?: string;
}

/**
 * Builds a complete un-simulated Stellar Transaction for creating a gift.
 */
export function buildCreateGiftTx(
  params: CreateGiftParams,
  options: BuildTxOptions,
): Transaction {
  const op = buildCreateGiftOp(params);
  return new TransactionBuilder(options.sourceAccount, {
    fee: options.baseFee ?? "100000",
    networkPassphrase: options.networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(TimeoutInfinite)
    .build();
}

/**
 * Builds a complete un-simulated Stellar Transaction for claiming a gift via relayer.
 */
export function buildClaimTx(
  params: ClaimGiftParams,
  options: BuildTxOptions,
): Transaction {
  const op = buildClaimOp(params);
  return new TransactionBuilder(options.sourceAccount, {
    fee: options.baseFee ?? "100000",
    networkPassphrase: options.networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(TimeoutInfinite)
    .build();
}

/**
 * Builds a complete un-simulated Stellar Transaction for refunding an expired gift.
 */
export function buildRefundTx(
  params: RefundGiftParams,
  options: BuildTxOptions,
): Transaction {
  const op = buildRefundOp(params);
  return new TransactionBuilder(options.sourceAccount, {
    fee: options.baseFee ?? "100000",
    networkPassphrase: options.networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(TimeoutInfinite)
    .build();
}

