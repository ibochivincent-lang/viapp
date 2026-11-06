#!/usr/bin/env bash
set -euo pipefail

IDENTITY=${1:-alice}
NETWORK=${2:-testnet}

echo "============================================="
echo " ViApp Soroban Vault Testnet Deployment Script "
echo "============================================="

if ! command -v stellar &> /dev/null; then
    echo "Error: stellar CLI not found. Please install the Stellar CLI."
    exit 1
fi

echo "[1/4] Ensuring identity '${IDENTITY}' exists..."
if ! stellar keys ls 2>&1 | grep -q "${IDENTITY}"; then
    echo "Generating identity '${IDENTITY}'..."
    stellar keys generate "${IDENTITY}" --network "${NETWORK}"
else
    echo "Found existing identity '${IDENTITY}'."
fi

DEPLOYER_ADDRESS=$(stellar keys address "${IDENTITY}")
echo "Deployer Address: ${DEPLOYER_ADDRESS}"

echo "[2/4] Funding deployer via Friendbot on ${NETWORK}..."
stellar keys fund "${IDENTITY}" --network "${NETWORK}" || true

WASM_PATH="target/wasm32v1-none/release/viapp_gift_vault.wasm"
if [ ! -f "${WASM_PATH}" ]; then
    echo "Building release WASM target..."
    stellar contract build
fi

if [ ! -f "${WASM_PATH}" ]; then
    echo "Error: WASM file not found at ${WASM_PATH}"
    exit 1
fi

echo "[3/4] Deploying WASM to ${NETWORK}..."
CONTRACT_ID=$(stellar contract deploy \
    --wasm "${WASM_PATH}" \
    --source "${IDENTITY}" \
    --network "${NETWORK}")

echo "Contract Deployed Successfully!"
echo "CONTRACT ID: ${CONTRACT_ID}"

echo "[4/4] Initializing ViApp Gift Vault contract..."
NATIVE_TOKEN="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"

stellar contract invoke \
    --id "${CONTRACT_ID}" \
    --source "${IDENTITY}" \
    --network "${NETWORK}" \
    -- initialize \
    --admin "${DEPLOYER_ADDRESS}" \
    --relayer "${DEPLOYER_ADDRESS}" \
    --initial_tokens "[\"${NATIVE_TOKEN}\"]"

echo "============================================="
echo " ViApp Deployment Complete! "
echo " Network:     ${NETWORK}"
echo " Contract ID: ${CONTRACT_ID}"
echo " Admin:       ${DEPLOYER_ADDRESS}"
echo "============================================="
