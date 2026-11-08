// Verified Stellar transactions and Soroban contracts behind the viapp protocol.
export const PROOF = {
  firstBuy: "6a1623c52a0403c6aba600d8cf35fbc77a8830f614138152066c7a7d906aa9f3",
  gift1Locked: "c01b783813eb3cde47888012996e09031b98cc8d49408e7521a694b218e2c087",
  gift1Claimed: "6a13e2e8f14630a8a4777bf7bae7befa21154fe64ba0e64d58a7ccdca71978e8",
  gift2Wrapped: "8ec1e0666350aa500bbf2f7d36b1cd97bb8dfb2e9fd5ba328b75b899a36c38d6",
  gift2Claimed: "660e8ebcc983db623db05e87fa7e0c7f4583ff208f7fdb884864d86c0825e28e",
} as const;

/** A hash or address formatted: 6a16...a9f3. */
export function shortHex(value: string): string {
  const clean = value.startsWith("0x") ? value.slice(2) : value;
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

export function txUrl(hash: string): string {
  const clean = hash.startsWith("0x") ? hash.slice(2) : hash;
  return `https://stellar.expert/explorer/testnet/tx/${clean}`;
}

export function addressUrl(address: string): string {
  return `https://stellar.expert/explorer/testnet/account/${address}`;
}

/** The vault's verified Soroban contract. */
export function sourceUrl(address: string): string {
  return `https://stellar.expert/explorer/testnet/contract/${address}`;
}
