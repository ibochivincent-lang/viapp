import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}





export interface Gift {
  amount: i128;
  claim_key: Buffer;
  expiry: u64;
  sealed_note: Buffer;
  sender: string;
  state: State;
  token: string;
}

export enum State {
  None = 0,
  Open = 1,
  Claimed = 2,
  Refunded = 3,
}




export const VaultError = {
  1: {message:"AlreadyInitialized"},
  2: {message:"NotInitialized"},
  3: {message:"Unauthorized"},
  4: {message:"NotRelayer"},
  5: {message:"TokenNotListed"},
  6: {message:"ZeroAmount"},
  7: {message:"ZeroClaimKey"},
  8: {message:"ClaimKeyAlreadyUsed"},
  9: {message:"ExpiryOutOfRange"},
  10: {message:"NoteTooLong"},
  11: {message:"GiftNotOpen"},
  12: {message:"GiftExpired"},
  13: {message:"GiftNotExpired"},
  14: {message:"BadRecipient"},
  15: {message:"BadSigner"},
  16: {message:"BadKeyProof"},
  17: {message:"Paused"},
  18: {message:"NoAmountReceived"},
  19: {message:"TooManyTokens"},
  20: {message:"NothingToRescue"}
}

export interface Client {
  /**
   * Construct and simulate a claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Pays an open gift to `recipient`, authorized by a signature from the gift's claim key.
   */
  claim: ({gift_id, recipient, signature}: {gift_id: u64, recipient: string, signature: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a pause transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pause: (options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a refund transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns an expired, unclaimed gift to its original sender. Unpausable.
   */
  refund: ({gift_id}: {gift_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a unpause transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unpause: (options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_gift transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_gift: ({gift_id}: {gift_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Option<Gift>>>

  /**
   * Construct and simulate a is_listed transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  is_listed: ({token}: {token: string}, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a is_paused transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  is_paused: (options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initializes the vault with its owner, relayer and initial listed token list.
   */
  initialize: ({admin, relayer, initial_tokens}: {admin: string, relayer: string, initial_tokens: Array<string>}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a create_gift transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Locks `amount` of a listed `token` from `sender` as a new gift that can be claimed by the holder of `claim_key`.
   */
  create_gift: ({sender, token, amount, claim_key, expiry, sealed_note, key_proof}: {sender: string, token: string, amount: i128, claim_key: Buffer, expiry: u64, sealed_note: Buffer, key_proof: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u64>>>

  /**
   * Construct and simulate a liabilities transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  liabilities: ({token}: {token: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a set_relayer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_relayer: ({new_relayer}: {new_relayer: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a listed_tokens transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  listed_tokens: (options?: MethodOptions) => Promise<AssembledTransaction<Array<string>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAFZQYXlzIGFuIG9wZW4gZ2lmdCB0byBgcmVjaXBpZW50YCwgYXV0aG9yaXplZCBieSBhIHNpZ25hdHVyZSBmcm9tIHRoZSBnaWZ0J3MgY2xhaW0ga2V5LgAAAAAABWNsYWltAAAAAAAAAwAAAAAAAAAHZ2lmdF9pZAAAAAAGAAAAAAAAAAlyZWNpcGllbnQAAAAAAAATAAAAAAAAAAlzaWduYXR1cmUAAAAAAAPuAAAAQAAAAAEAAAPpAAAAAgAAB9AAAAAKVmF1bHRFcnJvcgAA",
        "AAAAAAAAAAAAAAAFcGF1c2UAAAAAAAAAAAAAAQAAA+kAAAACAAAH0AAAAApWYXVsdEVycm9yAAA=",
        "AAAAAAAAAEZSZXR1cm5zIGFuIGV4cGlyZWQsIHVuY2xhaW1lZCBnaWZ0IHRvIGl0cyBvcmlnaW5hbCBzZW5kZXIuIFVucGF1c2FibGUuAAAAAAAGcmVmdW5kAAAAAAABAAAAAAAAAAdnaWZ0X2lkAAAAAAYAAAABAAAD6QAAAAIAAAfQAAAAClZhdWx0RXJyb3IAAA==",
        "AAAAAAAAAAAAAAAHdW5wYXVzZQAAAAAAAAAAAQAAA+kAAAACAAAH0AAAAApWYXVsdEVycm9yAAA=",
        "AAAAAAAAAAAAAAAIZ2V0X2dpZnQAAAABAAAAAAAAAAdnaWZ0X2lkAAAAAAYAAAABAAAD6AAAB9AAAAAER2lmdA==",
        "AAAAAAAAAAAAAAAJaXNfbGlzdGVkAAAAAAAAAQAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAQAAAAE=",
        "AAAAAAAAAAAAAAAJaXNfcGF1c2VkAAAAAAAAAAAAAAEAAAAB",
        "AAAAAAAAAExJbml0aWFsaXplcyB0aGUgdmF1bHQgd2l0aCBpdHMgb3duZXIsIHJlbGF5ZXIgYW5kIGluaXRpYWwgbGlzdGVkIHRva2VuIGxpc3QuAAAACmluaXRpYWxpemUAAAAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAHcmVsYXllcgAAAAATAAAAAAAAAA5pbml0aWFsX3Rva2VucwAAAAAD6gAAABMAAAABAAAD6QAAAAIAAAfQAAAAClZhdWx0RXJyb3IAAA==",
        "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" ]),
      options
    )
  }
  public readonly fromJSON = {
    claim: this.txFromJSON<Result<void>>,
        pause: this.txFromJSON<Result<void>>,
        refund: this.txFromJSON<Result<void>>,
        unpause: this.txFromJSON<Result<void>>,
        get_gift: this.txFromJSON<Option<Gift>>,
        is_listed: this.txFromJSON<boolean>,
        is_paused: this.txFromJSON<boolean>,
        initialize: this.txFromJSON<Result<void>>,
        create_gift: this.txFromJSON<Result<u64>>,
        liabilities: this.txFromJSON<i128>,
        set_relayer: this.txFromJSON<Result<void>>,
        listed_tokens: this.txFromJSON<Array<string>>
  }
}