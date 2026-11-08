#![cfg(test)]

use viapp_gift_vault::types::State;
use viapp_gift_vault::{GiftVault, GiftVaultClient};

use ed25519_dalek::{Signer, SigningKey};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{Client as TokenClient, StellarAssetClient},
    Address, Bytes, BytesN, Env, Vec,
};

fn generate_keypair() -> ([u8; 32], [u8; 32], SigningKey) {
    let seed: [u8; 32] = [42u8; 32];
    let signing_key = SigningKey::from_bytes(&seed);
    let verifying_key = signing_key.verifying_key();
    (seed, verifying_key.to_bytes(), signing_key)
}

fn compute_register_proof(
    env: &Env,
    contract_id: &Address,
    sender: &Address,
    signing_key: &SigningKey,
) -> BytesN<64> {
    let mut msg = Bytes::new(env);
    msg.append(&Bytes::from_slice(env, b"viapp:register:"));
    msg.append(&env.ledger().network_id().into());
    msg.append(&contract_id.to_string().to_bytes());
    msg.append(&sender.to_string().to_bytes());
    let digest: BytesN<32> = env.crypto().sha256(&msg).into();
    
    let mut digest_arr = [0u8; 32];
    digest.copy_into_slice(&mut digest_arr);
    let sig = signing_key.sign(&digest_arr);
    BytesN::from_array(env, &sig.to_bytes())
}

fn compute_claim_sig(
    env: &Env,
    contract_id: &Address,
    gift_id: u64,
    recipient: &Address,
    signing_key: &SigningKey,
) -> BytesN<64> {
    let mut msg = Bytes::new(env);
    msg.append(&Bytes::from_slice(env, b"viapp:claim:"));
    msg.append(&env.ledger().network_id().into());
    msg.append(&contract_id.to_string().to_bytes());
    
    let mut id_bytes = [0u8; 8];
    id_bytes.copy_from_slice(&gift_id.to_be_bytes());
    msg.append(&Bytes::from_slice(env, &id_bytes));
    msg.append(&recipient.to_string().to_bytes());
    
    let digest: BytesN<32> = env.crypto().sha256(&msg).into();
    let mut digest_arr = [0u8; 32];
    digest.copy_into_slice(&mut digest_arr);
    let sig = signing_key.sign(&digest_arr);
    BytesN::from_array(env, &sig.to_bytes())
}

#[test]
fn test_initialize_and_view_functions() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let relayer = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract_v2(token_admin.clone());

    let contract_id = env.register(GiftVault, ());
    let client = GiftVaultClient::new(&env, &contract_id);

    let mut tokens = Vec::new(&env);
    tokens.push_back(token_id.address());

    client.initialize(&admin, &relayer, &tokens);

    assert_eq!(client.listed_tokens().len(), 1);
    assert_eq!(client.is_listed(&token_id.address()), true);
    assert_eq!(client.is_paused(), false);
}

#[test]
fn test_pause_unpause() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let relayer = Address::generate(&env);

    let contract_id = env.register(GiftVault, ());
    let client = GiftVaultClient::new(&env, &contract_id);

    client.initialize(&admin, &relayer, &Vec::new(&env));

    assert_eq!(client.is_paused(), false);
    client.pause();
    assert_eq!(client.is_paused(), true);
    client.unpause();
    assert_eq!(client.is_paused(), false);
}

#[test]
fn test_create_gift_and_claim_success() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000_000);

    let admin = Address::generate(&env);
    let relayer = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_client = TokenClient::new(&env, &token_id.address());
    let token_asset_client = StellarAssetClient::new(&env, &token_id.address());

    token_asset_client.mint(&sender, &1_000_0000000);

    let contract_id = env.register(GiftVault, ());
    let client = GiftVaultClient::new(&env, &contract_id);

    let mut tokens = Vec::new(&env);
    tokens.push_back(token_id.address());
    client.initialize(&admin, &relayer, &tokens);

    let (_seed, pubkey, signing_key) = generate_keypair();
    let claim_key = BytesN::from_array(&env, &pubkey);
    let key_proof = compute_register_proof(&env, &contract_id, &sender, &signing_key);

    let expiry = 1_000_000 + 86400; // +1 day
    let note = Bytes::from_slice(&env, b"Welcome to viapp!");

    let gift_id = client.create_gift(
        &sender,
        &token_id.address(),
        &500_0000000,
        &claim_key,
        &expiry,
        &note,
        &key_proof,
    );

    assert_eq!(gift_id, 1);
    assert_eq!(client.liabilities(&token_id.address()), 500_0000000);
    assert_eq!(token_client.balance(&contract_id), 500_0000000);
    assert_eq!(token_client.balance(&sender), 500_0000000);

    let gift = client.get_gift(&gift_id).unwrap();
    assert_eq!(gift.state, State::Open);
    assert_eq!(gift.amount, 500_0000000);

    // Claim gift
    let claim_sig = compute_claim_sig(&env, &contract_id, gift_id, &recipient, &signing_key);
    client.claim(&gift_id, &recipient, &claim_sig);

    assert_eq!(token_client.balance(&recipient), 500_0000000);
    assert_eq!(client.liabilities(&token_id.address()), 0);

    let claimed_gift = client.get_gift(&gift_id).unwrap();
    assert_eq!(claimed_gift.state, State::Claimed);
}

#[test]
fn test_refund_expired_success() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000_000);

    let admin = Address::generate(&env);
    let relayer = Address::generate(&env);
    let sender = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_client = TokenClient::new(&env, &token_id.address());
    let token_asset_client = StellarAssetClient::new(&env, &token_id.address());

    token_asset_client.mint(&sender, &1_000_0000000);

    let contract_id = env.register(GiftVault, ());
    let client = GiftVaultClient::new(&env, &contract_id);

    let mut tokens = Vec::new(&env);
    tokens.push_back(token_id.address());
    client.initialize(&admin, &relayer, &tokens);

    let (_seed, pubkey, signing_key) = generate_keypair();
    let claim_key = BytesN::from_array(&env, &pubkey);
    let key_proof = compute_register_proof(&env, &contract_id, &sender, &signing_key);

    let expiry = 1_000_000 + 86400; // +1 day
    let note = Bytes::from_slice(&env, b"Expired Gift");

    let gift_id = client.create_gift(
        &sender,
        &token_id.address(),
        &300_0000000,
        &claim_key,
        &expiry,
        &note,
        &key_proof,
    );

    // Fast-forward past expiry
    env.ledger().set_timestamp(expiry + 100);

    // Refund
    client.refund(&gift_id);

    assert_eq!(token_client.balance(&sender), 1_000_0000000);
    assert_eq!(client.liabilities(&token_id.address()), 0);

    let refunded_gift = client.get_gift(&gift_id).unwrap();
    assert_eq!(refunded_gift.state, State::Refunded);
}

#[test]
fn test_unpausable_refund() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000_000);

    let admin = Address::generate(&env);
    let relayer = Address::generate(&env);
    let sender = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_client = TokenClient::new(&env, &token_id.address());
    let token_asset_client = StellarAssetClient::new(&env, &token_id.address());

    token_asset_client.mint(&sender, &1_000_0000000);

    let contract_id = env.register(GiftVault, ());
    let client = GiftVaultClient::new(&env, &contract_id);

    let mut tokens = Vec::new(&env);
    tokens.push_back(token_id.address());
    client.initialize(&admin, &relayer, &tokens);

    let (_seed, pubkey, signing_key) = generate_keypair();
    let claim_key = BytesN::from_array(&env, &pubkey);
    let key_proof = compute_register_proof(&env, &contract_id, &sender, &signing_key);

    let expiry = 1_000_000 + 86400; // +1 day
    let note = Bytes::from_slice(&env, b"Will refund during pause");

    let gift_id = client.create_gift(
        &sender,
        &token_id.address(),
        &400_0000000,
        &claim_key,
        &expiry,
        &note,
        &key_proof,
    );

    // Pause contract
    client.pause();
    assert_eq!(client.is_paused(), true);

    // Fast-forward past expiry
    env.ledger().set_timestamp(expiry + 100);

    // Refund MUST succeed even when paused!
    client.refund(&gift_id);

    assert_eq!(token_client.balance(&sender), 1_000_0000000);
    let refunded_gift = client.get_gift(&gift_id).unwrap();
    assert_eq!(refunded_gift.state, State::Refunded);
}

#[test]
fn test_multi_venue_tokenized_stocks_and_liabilities() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000_000);

    let admin = Address::generate(&env);
    let relayer = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    // Register 2 distinct SACs representing primary bStock (e.g. AAPLB) and secondary bStock (e.g. NVDAB)
    let bstock_admin = Address::generate(&env);
    let stock2_admin = Address::generate(&env);
    let bstock_id = env.register_stellar_asset_contract_v2(bstock_admin.clone());
    let stock2_id = env.register_stellar_asset_contract_v2(stock2_admin.clone());

    let bstock_client = TokenClient::new(&env, &bstock_id.address());
    let bstock_asset = StellarAssetClient::new(&env, &bstock_id.address());
    let stock2_client = TokenClient::new(&env, &stock2_id.address());
    let stock2_asset = StellarAssetClient::new(&env, &stock2_id.address());

    // Mint balances to sender
    bstock_asset.mint(&sender, &500_0000000);
    stock2_asset.mint(&sender, &500_0000000);

    let contract_id = env.register(GiftVault, ());
    let client = GiftVaultClient::new(&env, &contract_id);

    let mut tokens = Vec::new(&env);
    tokens.push_back(bstock_id.address());
    tokens.push_back(stock2_id.address());
    client.initialize(&admin, &relayer, &tokens);

    assert_eq!(client.listed_tokens().len(), 2);
    assert_eq!(client.is_listed(&bstock_id.address()), true);
    assert_eq!(client.is_listed(&stock2_id.address()), true);

    // Create gift 1 with bStock (AAPLB)
    let (_seed1, pubkey1, signing_key1) = generate_keypair();
    let claim_key1 = BytesN::from_array(&env, &pubkey1);
    let key_proof1 = compute_register_proof(&env, &contract_id, &sender, &signing_key1);
    let expiry1 = 1_000_000 + 86400;
    let note1 = Bytes::from_slice(&env, b"Gift of AAPLB stock");

    let gift_id1 = client.create_gift(
        &sender,
        &bstock_id.address(),
        &100_0000000,
        &claim_key1,
        &expiry1,
        &note1,
        &key_proof1,
    );

    // Create gift 2 with secondary bStock (NVDAB)
    let seed2: [u8; 32] = [88u8; 32];
    let signing_key2 = SigningKey::from_bytes(&seed2);
    let pubkey2 = signing_key2.verifying_key().to_bytes();
    let claim_key2 = BytesN::from_array(&env, &pubkey2);
    let key_proof2 = compute_register_proof(&env, &contract_id, &sender, &signing_key2);
    let expiry2 = 1_000_000 + 86400;
    let note2 = Bytes::from_slice(&env, b"Gift of secondary bStock");

    let gift_id2 = client.create_gift(
        &sender,
        &stock2_id.address(),
        &200_0000000,
        &claim_key2,
        &expiry2,
        &note2,
        &key_proof2,
    );

    // Check independent liabilities per stock token
    assert_eq!(client.liabilities(&bstock_id.address()), 100_0000000);
    assert_eq!(client.liabilities(&stock2_id.address()), 200_0000000);

    // Claim gift 1 via relayer
    let claim_sig1 = compute_claim_sig(&env, &contract_id, gift_id1, &recipient, &signing_key1);
    client.claim(&gift_id1, &recipient, &claim_sig1);

    // Recipient received bStock, liabilities updated
    assert_eq!(bstock_client.balance(&recipient), 100_0000000);
    assert_eq!(client.liabilities(&bstock_id.address()), 0);
    // secondary bStock liabilities untouched
    assert_eq!(client.liabilities(&stock2_id.address()), 200_0000000);

    // Fast forward and refund gift 2
    env.ledger().set_timestamp(expiry2 + 100);
    client.refund(&gift_id2);

    assert_eq!(stock2_client.balance(&sender), 500_0000000);
    assert_eq!(client.liabilities(&stock2_id.address()), 0);
}
