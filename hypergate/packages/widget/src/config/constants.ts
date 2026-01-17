// =============================================================================
// HyperGate Configuration Constants
// =============================================================================

/**
 * Validate an Ethereum address format
 */
function isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get environment variable with fallback
 * Works in both Vite (import.meta.env) and Node.js (process.env)
 */
function getEnvVar(key: string, fallback: string): string {
    // Vite environment
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return (import.meta.env as Record<string, string>)[key] || fallback;
    }
    // Node.js environment
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || fallback;
    }
    return fallback;
}

// =============================================================================
// Chain Configuration
// =============================================================================

export const CHAINS = {
    HYPEREVM: {
        // HyperEVM Mainnet Chain ID
        // Reference: https://hyperliquid.gitbook.io/
        id: 998,
        name: 'HyperEVM',
        rpcUrl: getEnvVar('VITE_RPC_URL', 'https://rpc.hyperliquid.xyz/evm'),
    }
} as const;

// =============================================================================
// Contract Addresses
// =============================================================================

// Verified addresses from Hyperliquid/Circle documentation
// Reference: https://docs.chainstack.com/docs/hyperliquid-bridging-usdc

// Mainnet addresses (verified)
const MAINNET_USDC_ADDRESS = '0xb88339CB7199b77E23DB6E890353E22632Ba630f';
const MAINNET_BRIDGE_ADDRESS = '0x6b9e773128f453f5c2c60935ee2de2cbc5390a24';

// Testnet addresses (verified)
const TESTNET_USDC_ADDRESS = '0x2B3370eE501B4a559b57D449569354196457D8Ab';
const TESTNET_BRIDGE_ADDRESS = '0x0b80659a4076e9e93c7dbe0f10675a16a3e5c206';

// System address for USDC bridging
const SYSTEM_ADDRESS = '0x2000000000000000000000000000000000000000';

export const CONTRACTS = {
    // Native USDC (Circle) on HyperEVM - Standard ERC20 token
    // Use this for DeFi apps, DEXs, and as the source for bridging
    USDC_HYPEREVM: getEnvVar('VITE_USDC_ADDRESS', MAINNET_USDC_ADDRESS) as `0x${string}`,

    // CoreDepositWallet (Circle's bridge contract)
    // NOT a standard ERC20 - use deposit() function after approving USDC
    ASSET_BRIDGE: getEnvVar('VITE_BRIDGE_ADDRESS', MAINNET_BRIDGE_ADDRESS) as `0x${string}`,

    // System address for USDC bridging operations
    SYSTEM_ADDRESS: SYSTEM_ADDRESS as `0x${string}`,

    // Testnet addresses (for development)
    TESTNET: {
        USDC: TESTNET_USDC_ADDRESS as `0x${string}`,
        BRIDGE: TESTNET_BRIDGE_ADDRESS as `0x${string}`,
    },
} as const;

// =============================================================================
// Deposit Limits
// =============================================================================

export const LIMITS = {
    // Minimum deposit in USD
    // Hyperliquid burns deposits < $5, so we enforce $5.10 as minimum
    MINIMUM_DEPOSIT: 5.1,

    // Maximum deposit in USD (safety cap)
    MAXIMUM_DEPOSIT: 100000,

    // Gas refuel amount in USD worth of HYPE
    GAS_REFUEL_AMOUNT: 1.0,
} as const;

// =============================================================================
// API Configuration
// =============================================================================

export const API = {
    // Backend API base URL
    BASE_URL: getEnvVar('VITE_API_BASE_URL', 'http://localhost:3001'),
} as const;

// =============================================================================
// Runtime Validation
// =============================================================================

/**
 * Validate configuration at runtime
 * Call this during app initialization to catch configuration errors early
 */
export function validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate USDC address
    if (!isValidAddress(CONTRACTS.USDC_HYPEREVM)) {
        errors.push(`Invalid USDC address: ${CONTRACTS.USDC_HYPEREVM} (must be 40 hex characters)`);
    }

    // Validate Bridge address
    if (!isValidAddress(CONTRACTS.ASSET_BRIDGE)) {
        errors.push(`Invalid Bridge address: ${CONTRACTS.ASSET_BRIDGE} (must be 40 hex characters)`);
    }

    // Check for burn address (0x000...000)
    const BURN_ADDRESS = '0x0000000000000000000000000000000000000000';
    if (CONTRACTS.USDC_HYPEREVM === BURN_ADDRESS) {
        errors.push('USDC address is set to burn address - funds will be lost! Set VITE_USDC_ADDRESS');
    }

    if (CONTRACTS.ASSET_BRIDGE === BURN_ADDRESS) {
        errors.push('Bridge address is set to burn address - funds will be lost! Set VITE_BRIDGE_ADDRESS');
    }

    // Verify addresses match expected mainnet values (warning only)
    if (CONTRACTS.USDC_HYPEREVM.toLowerCase() !== MAINNET_USDC_ADDRESS.toLowerCase()) {
        console.warn(`⚠️ USDC address differs from verified mainnet address. Using: ${CONTRACTS.USDC_HYPEREVM}`);
    }

    if (CONTRACTS.ASSET_BRIDGE.toLowerCase() !== MAINNET_BRIDGE_ADDRESS.toLowerCase()) {
        console.warn(`⚠️ Bridge address differs from verified mainnet address. Using: ${CONTRACTS.ASSET_BRIDGE}`);
    }

    // Validate RPC URL
    if (!CHAINS.HYPEREVM.rpcUrl.startsWith('http')) {
        errors.push(`Invalid RPC URL: ${CHAINS.HYPEREVM.rpcUrl}`);
    }

    // Log errors in development
    if (errors.length > 0 && typeof console !== 'undefined') {
        console.error('⚠️ HyperGate Configuration Errors:');
        errors.forEach(err => console.error(`  - ${err}`));
    }

    return { valid: errors.length === 0, errors };
}

// Auto-validate in development
if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    validateConfiguration();
}
