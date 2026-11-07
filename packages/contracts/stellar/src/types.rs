use soroban_sdk::{contractevent, contracttype, Address, Bytes, BytesN};

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum State {
    None = 0,
    Open = 1,
    Claimed = 2,
    Refunded = 3,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Gift {
    pub token: Address,
    pub sender: Address,
    pub claim_key: BytesN<32>,
    pub amount: i128,
    pub expiry: u64,
    pub state: State,
    pub sealed_note: Bytes,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Relayer,
    NextGiftId,
    IsPaused,
    ListedTokens,
    IsListed(Address),
    Gift(u64),
    ClaimKeyUsed(BytesN<32>),
    Liabilities(Address),
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GiftCreated {
    #[topic]
    pub sender: Address,
    #[topic]
    pub token: Address,
    pub gift_id: u64,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GiftClaimed {
    #[topic]
    pub gift_id: u64,
    pub recipient: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GiftRefunded {
    #[topic]
    pub gift_id: u64,
    pub sender: Address,
}

