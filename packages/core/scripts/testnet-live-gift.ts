import { Keypair, StrKey } from "@stellar/stellar-sdk";
import { execSync } from "node:child_process";
import {
  newStellarClaimKey,
  sealNote,
  stellarSignClaim,
  stellarSignKeyProof,
} from "../src/gift.js";

const VAULT_CONTRACT_ID = "CDEDHFJ7POEWDFFDRV74ZIWK4CSDKGEN4B4IQXUZHMKGVMJIVFODEV5M";
const TOKEN_CONTRACT_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const SENDER_IDENTITY = "test-eval";
const SENDER_ADDRESS = "GAZWESWQPZOIH2EH3IL37THBLKGLAC5FCHTLMWAXJGLKJPT4NRRIHN6B";

async function main() {
  console.log("=== Stellar Testnet Live Gift & Stock Settlement Execution ===");
  console.log(`Contract: ${VAULT_CONTRACT_ID}`);
  console.log(`Token (XLM SAC): ${TOKEN_CONTRACT_ID}`);
  console.log(`Sender: ${SENDER_ADDRESS}\n`);

  // 1. Generate fresh claim keypair
  const claim = newStellarClaimKey();
  const claimPubKeyHex = Buffer.from(StrKey.decodeEd25519PublicKey(claim.address)).toString("hex");
  console.log(`1. Generated Gift Claim Secret: ${claim.privateKey}`);
  console.log(`   Public Claim Key: ${claim.address} (hex: ${claimPubKeyHex})`);

  // 2. Encrypt note with HKDF + AES-256-GCM
  const noteText = "Congratulations! Here is your tokenized stock share on Stellar.";
  const sealed = await sealNote(claim.privateKey, noteText);
  const sealedHex = sealed.startsWith("0x") ? sealed.slice(2) : sealed;
  console.log(`2. Sealed Note: ${sealed.slice(0, 32)}... (${sealedHex.length / 2} bytes)`);

  // 3. Generate Ed25519 registration proof
  const expiry = Math.floor(Date.now() / 1000) + 86400 * 7;
  const keyProofHex = await stellarSignKeyProof(
    claim.privateKey,
    VAULT_CONTRACT_ID,
    NETWORK_PASSPHRASE,
    SENDER_ADDRESS,
  );
  console.log(`3. Generated Ed25519 Key Proof: ${keyProofHex.slice(0, 32)}...`);

  // 4. Execute create_gift via Stellar CLI
  console.log("\n4. Submitting create_gift transaction to Stellar Testnet...");
  const createCmd = [
    "stellar contract invoke",
    `--id ${VAULT_CONTRACT_ID}`,
    `--source-account ${SENDER_IDENTITY}`,
    "--network testnet",
    "--send=yes",
    "--",
    "create_gift",
    `--sender ${SENDER_ADDRESS}`,
    `--token ${TOKEN_CONTRACT_ID}`,
    "--amount 10000000", // 1 XLM in 7 decimals
    `--claim_key ${claimPubKeyHex}`,
    `--expiry ${expiry}`,
    `--sealed_note ${sealedHex}`,
    `--key_proof ${keyProofHex}`,
  ].join(" ");

  try {
    const createOutput = execSync(createCmd, { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
    console.log("   create_gift response:");
    console.log(createOutput.trim());

    // Extract return value (gift_id)
    const lines = createOutput.trim().split("\n");
    const lastLine = lines[lines.length - 1].trim();
    const giftId = parseInt(lastLine, 10);
    console.log(`   \n>>> Successfully Created Gift ID: ${giftId}`);

    // 5. Query contract state to verify gift is open
    console.log("\n5. Verifying Gift state on ledger...");
    const verifyCmd = `stellar contract invoke --id ${VAULT_CONTRACT_ID} --source-account ${SENDER_IDENTITY} --network testnet -- get_gift --gift_id ${giftId}`;
    const verifyOutput = execSync(verifyCmd, { encoding: "utf-8" });
    console.log(verifyOutput.trim());

    // 6. Claim the gift on behalf of recipient
    const recipientKeypair = Keypair.random();
    const recipientAddress = recipientKeypair.publicKey();
    console.log(`\n6. Claiming Gift ID ${giftId} for recipient ${recipientAddress}...`);

    const claimSigHex = await stellarSignClaim(
      claim.privateKey,
      VAULT_CONTRACT_ID,
      NETWORK_PASSPHRASE,
      BigInt(giftId),
      recipientAddress,
    );

    const claimCmd = [
      "stellar contract invoke",
      `--id ${VAULT_CONTRACT_ID}`,
      `--source-account ${SENDER_IDENTITY}`,
      "--network testnet",
      "--send=yes",
      "--",
      "claim",
      `--gift_id ${giftId}`,
      `--recipient ${recipientAddress}`,
      `--signature ${claimSigHex}`,
    ].join(" ");

    const claimOutput = execSync(claimCmd, { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
    console.log("   claim response:");
    console.log(claimOutput.trim());
    console.log(`\n>>> Successfully Claimed Gift ID: ${giftId}!`);
  } catch (err: any) {
    console.error("Execution error:", err.stdout || err.stderr || err.message);
  }
}

main().catch(console.error);
