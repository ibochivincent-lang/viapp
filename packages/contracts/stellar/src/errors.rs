use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum VaultError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    NotRelayer = 4,
    TokenNotListed = 5,
    ZeroAmount = 6,
    ZeroClaimKey = 7,
    ClaimKeyAlreadyUsed = 8,
    ExpiryOutOfRange = 9,
    NoteTooLong = 10,
    GiftNotOpen = 11,
    GiftExpired = 12,
    GiftNotExpired = 13,
    BadRecipient = 14,
    BadSigner = 15,
    BadKeyProof = 16,
    Paused = 17,
    NoAmountReceived = 18,
    TooManyTokens = 19,
    NothingToRescue = 20,
}

