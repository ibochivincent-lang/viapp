#![no_std]

pub mod errors;
pub mod types;

use errors::VaultError;
use types::{DataKey, Gift, GiftClaimed, GiftCreated, GiftRefunded, State};

use soroban_sdk::{
    contract, contractimpl, token, Address, Bytes, BytesN, Env, Vec,
};

const MIN_LIFETIME: u64 = 3600; // 1 hour
const MAX_LIFETIME: u64 = 90 * 86400; // 90 days
const MAX_NOTE_BYTES: u32 = 512;
const MAX_TOKENS: u32 = 32;

// Storage TTL extensions
const INSTANCE_BUMP_AMOUNT: u32 = 7 * 86400 / 5; // ~7 days in ledgers
const INSTANCE_LIFETIME_THRESHOLD: u32 = 86400 / 5; // ~1 day in ledgers
const PERSISTENT_BUMP_AMOUNT: u32 = 95 * 86400 / 5; // ~95 days in ledgers
const PERSISTENT_LIFETIME_THRESHOLD: u32 = 30 * 86400 / 5; // ~30 days in ledgers

#[contract]
pub struct GiftVault;

#[contractimpl]
impl GiftVault {
    /// Initializes the vault with its owner, relayer and initial listed token list.
    pub fn initialize(
        env: Env,
        admin: Address,
        relayer: Address,
        initial_tokens: Vec<Address>,
    ) -> Result<(), VaultError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(VaultError::AlreadyInitialized);
        }
        if initial_tokens.len() > MAX_TOKENS {
            return Err(VaultError::TooManyTokens);
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Relayer, &relayer);
        env.storage().instance().set(&DataKey::NextGiftId, &1u64);
        env.storage().instance().set(&DataKey::IsPaused, &false);

        let mut listed = Vec::new(&env);
        for token in initial_tokens.iter() {
            env.storage().persistent().set(&DataKey::IsListed(token.clone()), &true);
            listed.push_back(token);
        }
        env.storage().persistent().set(&DataKey::ListedTokens, &listed);

        env.storage().instance().extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
        Ok(())
    }

    /// Locks `amount` of a listed `token` from `sender` as a new gift that can be claimed by the holder of `claim_key`.
    pub fn create_gift(
        env: Env,
        sender: Address,
        token: Address,
        amount: i128,
        claim_key: BytesN<32>,
        expiry: u64,
        sealed_note: Bytes,
        key_proof: BytesN<64>,
    ) -> Result<u64, VaultError> {
        sender.require_auth();

        if Self::is_paused(&env) {
            return Err(VaultError::Paused);
        }
        if !Self::is_listed(&env, &token) {
            return Err(VaultError::TokenNotListed);
        }
        if amount <= 0 {
            return Err(VaultError::ZeroAmount);
        }
        if sealed_note.len() > MAX_NOTE_BYTES {
            return Err(VaultError::NoteTooLong);
        }

        let now = env.ledger().timestamp();
        if expiry < now + MIN_LIFETIME || expiry > now + MAX_LIFETIME {
            return Err(VaultError::ExpiryOutOfRange);
        }

        if env.storage().persistent().has(&DataKey::ClaimKeyUsed(claim_key.clone())) {
            return Err(VaultError::ClaimKeyAlreadyUsed);
        }

        // Verify key_proof over sha256("viapp:register:{network}:{contract_id}:{sender}")
        let mut msg = Bytes::new(&env);
        msg.append(&Bytes::from_slice(&env, b"viapp:register:"));
        msg.append(&env.ledger().network_id().into());
        msg.append(&env.current_contract_address().to_string().to_bytes());
        msg.append(&sender.to_string().to_bytes());
        let register_digest: BytesN<32> = env.crypto().sha256(&msg).into();

        env.crypto().ed25519_verify(&claim_key, &register_digest.into(), &key_proof);

        // Pull tokens from sender into contract
        let client = token::Client::new(&env, &token);
        client.transfer(&sender, &env.current_contract_address(), &amount);

        let gift_id: u64 = env.storage().instance().get(&DataKey::NextGiftId).unwrap_or(1);
        env.storage().instance().set(&DataKey::NextGiftId, &(gift_id + 1));
        env.storage().persistent().set(&DataKey::ClaimKeyUsed(claim_key.clone()), &true);

        let current_liabilities: i128 = env.storage().persistent().get(&DataKey::Liabilities(token.clone())).unwrap_or(0);
        env.storage().persistent().set(&DataKey::Liabilities(token.clone()), &(current_liabilities + amount));

        let gift = Gift {
            token: token.clone(),
            sender: sender.clone(),
            claim_key,
            amount,
            expiry,
            state: State::Open,
            sealed_note,
        };

        env.storage().persistent().set(&DataKey::Gift(gift_id), &gift);
        env.storage().persistent().extend_ttl(&DataKey::Gift(gift_id), PERSISTENT_LIFETIME_THRESHOLD, PERSISTENT_BUMP_AMOUNT);
        env.storage().instance().extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        GiftCreated {
            sender,
            token,
            gift_id,
            amount,
        }
        .publish(&env);

        Ok(gift_id)
    }

    /// Pays an open gift to `recipient`, authorized by a signature from the gift's claim key.
    pub fn claim(
        env: Env,
        gift_id: u64,
        recipient: Address,
        signature: BytesN<64>,
    ) -> Result<(), VaultError> {
        let relayer: Address = env.storage().instance().get(&DataKey::Relayer).ok_or(VaultError::NotInitialized)?;
        relayer.require_auth();

        if Self::is_paused(&env) {
            return Err(VaultError::Paused);
        }

        let mut gift: Gift = env.storage().persistent().get(&DataKey::Gift(gift_id)).ok_or(VaultError::GiftNotOpen)?;
        if gift.state != State::Open {
            return Err(VaultError::GiftNotOpen);
        }

        let now = env.ledger().timestamp();
        if now >= gift.expiry {
            return Err(VaultError::GiftExpired);
        }
        if recipient == env.current_contract_address() {
            return Err(VaultError::BadRecipient);
        }

        // Verify claim signature over sha256("viapp:claim:{network}:{contract_id}:{gift_id}:{recipient}")
        let mut msg = Bytes::new(&env);
        msg.append(&Bytes::from_slice(&env, b"viapp:claim:"));
        msg.append(&env.ledger().network_id().into());
        msg.append(&env.current_contract_address().to_string().to_bytes());
        
        let mut id_bytes = [0u8; 8];
        id_bytes.copy_from_slice(&gift_id.to_be_bytes());
        msg.append(&Bytes::from_slice(&env, &id_bytes));
        msg.append(&recipient.to_string().to_bytes());
        
        let claim_digest: BytesN<32> = env.crypto().sha256(&msg).into();
        env.crypto().ed25519_verify(&gift.claim_key, &claim_digest.into(), &signature);

        // State change before token transfer (Checks-Effects-Interactions)
        gift.state = State::Claimed;
        env.storage().persistent().set(&DataKey::Gift(gift_id), &gift);

        let liabilities: i128 = env.storage().persistent().get(&DataKey::Liabilities(gift.token.clone())).unwrap_or(0);
        env.storage().persistent().set(&DataKey::Liabilities(gift.token.clone()), &(liabilities - gift.amount));

        let client = token::Client::new(&env, &gift.token);
        client.transfer(&env.current_contract_address(), &recipient, &gift.amount);

        GiftClaimed {
            gift_id,
            recipient,
        }
        .publish(&env);

        Ok(())
    }

    /// Returns an expired, unclaimed gift to its original sender. Unpausable.
    pub fn refund(env: Env, gift_id: u64) -> Result<(), VaultError> {
        let mut gift: Gift = env.storage().persistent().get(&DataKey::Gift(gift_id)).ok_or(VaultError::GiftNotOpen)?;
        if gift.state != State::Open {
            return Err(VaultError::GiftNotOpen);
        }

        let now = env.ledger().timestamp();
        if now < gift.expiry {
            return Err(VaultError::GiftNotExpired);
        }

        // State change before token transfer
        gift.state = State::Refunded;
        env.storage().persistent().set(&DataKey::Gift(gift_id), &gift);

        let liabilities: i128 = env.storage().persistent().get(&DataKey::Liabilities(gift.token.clone())).unwrap_or(0);
        env.storage().persistent().set(&DataKey::Liabilities(gift.token.clone()), &(liabilities - gift.amount));

        let client = token::Client::new(&env, &gift.token);
        client.transfer(&env.current_contract_address(), &gift.sender, &gift.amount);

        GiftRefunded {
            gift_id,
            sender: gift.sender,
        }
        .publish(&env);

        Ok(())
    }

    pub fn get_gift(env: Env, gift_id: u64) -> Option<Gift> {
        env.storage().persistent().get(&DataKey::Gift(gift_id))
    }

    pub fn liabilities(env: Env, token: Address) -> i128 {
        env.storage().persistent().get(&DataKey::Liabilities(token)).unwrap_or(0)
    }

    pub fn listed_tokens(env: Env) -> Vec<Address> {
        env.storage().persistent().get(&DataKey::ListedTokens).unwrap_or(Vec::new(&env))
    }

    pub fn is_listed(env: &Env, token: &Address) -> bool {
        env.storage().persistent().get(&DataKey::IsListed(token.clone())).unwrap_or(false)
    }

    pub fn is_paused(env: &Env) -> bool {
        env.storage().instance().get(&DataKey::IsPaused).unwrap_or(false)
    }

    pub fn set_relayer(env: Env, new_relayer: Address) -> Result<(), VaultError> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).ok_or(VaultError::NotInitialized)?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::Relayer, &new_relayer);
        Ok(())
    }

    pub fn pause(env: Env) -> Result<(), VaultError> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).ok_or(VaultError::NotInitialized)?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::IsPaused, &true);
        Ok(())
    }

    pub fn unpause(env: Env) -> Result<(), VaultError> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).ok_or(VaultError::NotInitialized)?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::IsPaused, &false);
        Ok(())
    }
}

