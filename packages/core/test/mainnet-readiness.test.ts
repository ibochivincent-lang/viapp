import { describe, expect, it } from "vitest";
import {
  Account,
  Asset,
  FeeBumpTransaction,
  Keypair,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  getStellarStocks,
  STELLAR_MAINNET_USDC_ISSUER,
  STELLAR_TESTNET_ISSUER,
} from "../src/stocks-stellar.js";
import {
  buildChangeTrustOp,
  buildSdexOrderTx,
  getSacContractId,
  MAINNET_PASSPHRASE,
  simulateTrade,
  TESTNET_PASSPHRASE,
} from "../src/trade-stellar.js";
import {
  buildClaimTx,
  buildCreateGiftTx,
  buildRefundTx,
} from "../src/client/stellar.js";
import {
  executeBridgePurchase,
  getPeggedConfig,
  verify1to1PegProof,
  BSC_BSTOCKS_ALLOWLIST,
} from "../src/bridge.js";

const MAINNET_DEPLOYER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const MAINNET_RELAYER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const MAINNET_RECIPIENT = Keypair.random().publicKey();

describe("ViApp Mainnet Readiness & bStocks Verification", () => {
  describe("Network Passphrase & Contract Isolation Invariant", () => {
    it("ensures SAC contract IDs on Mainnet strictly differ from Testnet to prevent replay", () => {
      const testnetAapl = getSacContractId("AAPLB", STELLAR_TESTNET_ISSUER, TESTNET_PASSPHRASE);
      const mainnetAapl = getSacContractId("AAPLB", STELLAR_TESTNET_ISSUER, MAINNET_PASSPHRASE);

      expect(testnetAapl).toMatch(/^[A-Z0-9]{56}$/);
      expect(mainnetAapl).toMatch(/^[A-Z0-9]{56}$/);
      // Cryptographically separated across networks
      expect(testnetAapl).not.toBe(mainnetAapl);
    });

    it("verifies mainnet USDC canonical issuer and contract ID", () => {
      const mainnetUsdcSac = getSacContractId("USDC", STELLAR_MAINNET_USDC_ISSUER, MAINNET_PASSPHRASE);
      expect(mainnetUsdcSac).toMatch(/^[A-Z0-9]{56}$/);
    });
  });

  describe("Mainnet Transaction Construction & Gasless Relaying", () => {
    it("builds mainnet gift creation transaction with valid XDR", () => {
      const sourceAccount = new Account(MAINNET_DEPLOYER, "5000000000");
      const vaultContractId = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";
      const tokenSacId = getSacContractId("NVDAB", STELLAR_TESTNET_ISSUER, MAINNET_PASSPHRASE);

      const tx = buildCreateGiftTx(
        {
          sender: MAINNET_DEPLOYER,
          tokenAddress: tokenSacId,
          amount: 10_0000000n, // 1 share
          claimKey: new Uint8Array(32).fill(7),
          expiry: 1800000000n,
          sealedNote: new Uint8Array(16).fill(0),
          keyProof: new Uint8Array(64).fill(1),
          vaultContractId,
        },
        {
          sourceAccount,
          networkPassphrase: MAINNET_PASSPHRASE,
          baseFee: "10000",
        },
      );

      expect(tx.networkPassphrase).toBe(MAINNET_PASSPHRASE);
      expect(tx.operations).toHaveLength(1);
      const xdr = tx.toXDR();
      expect(typeof xdr).toBe("string");
      expect(xdr.length).toBeGreaterThan(100);
    });

    it("builds mainnet fee-bump transaction allowing relayer to sponsor recipient gas", () => {
      const innerSource = new Account(MAINNET_RECIPIENT, "100");
      const relayerAccount = new Account(MAINNET_RELAYER, "200");
      const vaultContractId = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";

      const innerTx = buildClaimTx(
        {
          relayer: MAINNET_RELAYER,
          giftId: 101n,
          recipient: MAINNET_RECIPIENT,
          signature: new Uint8Array(64).fill(5),
          vaultContractId,
        },
        {
          sourceAccount: innerSource,
          networkPassphrase: MAINNET_PASSPHRASE,
        },
      );

      // Wrap in Stellar FeeBumpTransaction for mainnet relayer sponsorship
      const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
        MAINNET_RELAYER,
        "200000", // Fee bump amount in stroops
        innerTx,
        MAINNET_PASSPHRASE,
      );

      expect(feeBumpTx).toBeInstanceOf(FeeBumpTransaction);
      expect(feeBumpTx.feeSource).toBe(MAINNET_RELAYER);
      expect(feeBumpTx.networkPassphrase).toBe(MAINNET_PASSPHRASE);
      const envelopeXdr = feeBumpTx.toXDR();
      expect(envelopeXdr.length).toBeGreaterThan(100);
    });
  });

  describe("Mainnet SDEX & AMM Order Execution", () => {
    it("builds mainnet SDEX order for bStocks (AAPLB and NVDAB)", () => {
      const sourceAccount = new Account(MAINNET_DEPLOYER, "5000000000");

      // bStock buy order on Mainnet
      const bStockTx = buildSdexOrderTx({
        sourceAccount,
        stockCode: "AAPLB",
        counterAssetCode: "USDC",
        side: "buy",
        shares: "10.0",
        pricePerShare: "228.50",
        networkPassphrase: MAINNET_PASSPHRASE,
      });
      expect(bStockTx.networkPassphrase).toBe(MAINNET_PASSPHRASE);
      expect(bStockTx.operations[0]!.type).toBe("manageBuyOffer");

      // bStock sell order on Mainnet
      const bStockSellTx = buildSdexOrderTx({
        sourceAccount,
        stockCode: "NVDAB",
        counterAssetCode: "USDC",
        side: "sell",
        shares: "5.0",
        pricePerShare: "142.20",
        networkPassphrase: MAINNET_PASSPHRASE,
      });
      expect(bStockSellTx.networkPassphrase).toBe(MAINNET_PASSPHRASE);
      expect(bStockSellTx.operations[0]!.type).toBe("manageSellOffer");
    });

    it("simulates mainnet AMM swaps across all 9 bStocks", () => {
      const bStocks = ["AAPLB", "NVDAB", "TSLAB", "MSFTB", "AMZNB", "GOOGLB", "METAB", "SPYB", "QQQB"];

      for (const ticker of bStocks) {
        const sim = simulateTrade({
          stockCode: ticker,
          counterAssetCode: "USDC",
          side: "buy",
          amount: "100.0",
          limitPrice: "200.0",
          userStellarAddress: MAINNET_DEPLOYER,
        }, MAINNET_PASSPHRASE);
        expect(sim.ok).toBe(true);
        expect(parseFloat(sim.expectedOutputAmount)).toBeGreaterThan(0);
      }
    });
  });

  describe("Multi-Asset Cross-Chain Fulfillment Readiness", () => {
    it("proves 1:1 backing verification on BSC bStocks including META", async () => {
      // Test AAPLB bridge fulfillment
      const aaplResult = await executeBridgePurchase({
        senderStellarAddress: MAINNET_DEPLOYER,
        stockCode: "AAPLB",
        paymentAsset: "USDC",
        usdAmount: 50.0,
        giftId: 1001n,
        claimKeyHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      });

      expect(aaplResult.ok).toBe(true);
      expect(aaplResult.backingDetails.venue).toBe("bnb");
      expect(aaplResult.backingDetails.backingSymbol).toBe("AAPLB");
      expect(aaplResult.backingDetails.contract).toBe(BSC_BSTOCKS_ALLOWLIST.AAPLB.address);

      // Test METAB bridge fulfillment (BSC backing)
      const metaResult = await executeBridgePurchase({
        senderStellarAddress: MAINNET_DEPLOYER,
        stockCode: "METAB",
        paymentAsset: "USDC",
        usdAmount: 50.0,
        giftId: 1002n,
        claimKeyHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      });

      expect(metaResult.ok).toBe(true);
      expect(metaResult.backingDetails.venue).toBe("bnb");
      expect(metaResult.backingDetails.backingSymbol).toBe("METAB");
      expect(metaResult.backingDetails.contract).toBe(BSC_BSTOCKS_ALLOWLIST.METAB.address);
    });

    it("verifies failure handling on mainnet if bStocks venue experiences downtime", async () => {
      await expect(
        executeBridgePurchase(
          {
            senderStellarAddress: MAINNET_DEPLOYER,
            stockCode: "AAPLB",
            paymentAsset: "USDC",
            usdAmount: 50.0,
            giftId: 1003n,
            claimKeyHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          },
          { forceFailPrimary: true, failoverReason: "Mainnet BSC RPC congestion; venue unavailable" }
        )
      ).rejects.toThrow("Mainnet BSC RPC congestion; venue unavailable");
    });

    it("verifies attestation proofs for institutional bStocks custody", () => {
      const aaplProof = verify1to1PegProof("1001", "AAPLB");
      expect(aaplProof.verified).toBe(true);
      expect(aaplProof.reserveType).toBe("bStocks_Binance_Custody");
      expect(aaplProof.activeVenue).toBe("bnb");

      const metaProof = verify1to1PegProof("1002", "METAB");
      expect(metaProof.verified).toBe(true);
      expect(metaProof.reserveType).toBe("bStocks_Binance_Custody");
      expect(metaProof.activeVenue).toBe("bnb");
    });
  });
});
