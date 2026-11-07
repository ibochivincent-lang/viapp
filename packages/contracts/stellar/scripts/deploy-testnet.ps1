param (
    [string]$Identity = "alice",
    [string]$Network = "testnet"
)

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " ViApp Soroban Vault Testnet Deployment Script " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Check stellar CLI
if (-not (Get-Command stellar -ErrorAction SilentlyContinue)) {
    Write-Error "stellar CLI not found. Please install the Stellar CLI."
    exit 1
}

# 2. Check if identity exists or generate one
Write-Host "`n[1/4] Ensuring identity '$Identity' exists..." -ForegroundColor Yellow
$identities = & stellar keys ls 2>&1
if ($identities -notmatch $Identity) {
    Write-Host "Generating identity '$Identity'..." -ForegroundColor Gray
    & stellar keys generate $Identity --network $Network
} else {
    Write-Host "Found existing identity '$Identity'." -ForegroundColor Green
}

$deployerAddress = (& stellar keys address $Identity).Trim()
Write-Host "Deployer Address: $deployerAddress" -ForegroundColor Green

# 3. Fund identity on testnet if needed
Write-Host "`n[2/4] Funding deployer via Friendbot on $Network..." -ForegroundColor Yellow
try {
    & stellar keys fund $Identity --network $Network
    Write-Host "Friendbot funded successfully." -ForegroundColor Green
} catch {
    Write-Host "Friendbot fund call finished." -ForegroundColor Gray
}

# 4. Locate WASM
$wasmPath = "target/wasm32v1-none/release/viapp_gift_vault.wasm"
if (-not (Test-Path $wasmPath)) {
    Write-Host "`nBuilding release WASM target..." -ForegroundColor Yellow
    & stellar contract build
}

if (-not (Test-Path $wasmPath)) {
    Write-Error "WASM file not found at $wasmPath even after build."
    exit 1
}

Write-Host "`n[3/4] Deploying WASM to $Network..." -ForegroundColor Yellow
$contractId = (& stellar contract deploy `
    --wasm $wasmPath `
    --source $Identity `
    --network $Network).Trim()

Write-Host "Contract Deployed Successfully!" -ForegroundColor Green
Write-Host "CONTRACT ID: $contractId" -ForegroundColor Magenta

# 5. Initialize contract
Write-Host "`n[4/4] Initializing ViApp Gift Vault contract..." -ForegroundColor Yellow
# Native XLM address on testnet: CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
$nativeToken = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"

& stellar contract invoke `
    --id $contractId `
    --source $Identity `
    --network $Network `
    -- initialize `
    --admin $deployerAddress `
    --relayer $deployerAddress `
    --initial_tokens "[$nativeToken]"

Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host " ViApp Deployment Complete! " -ForegroundColor Green
Write-Host " Network:     $Network" -ForegroundColor Gray
Write-Host " Contract ID: $contractId" -ForegroundColor Magenta
Write-Host " Admin:       $deployerAddress" -ForegroundColor Gray
Write-Host "=============================================" -ForegroundColor Cyan

