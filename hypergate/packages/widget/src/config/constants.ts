export const CHAINS = {
    HYPEREVM: {
        id: 998, // Verified from docs/research: Hyperliquid EVM Mainnet ID (often 999 or similar, will need verification. 998 is common for testnets, check docs)
        // NOTE: For now using 998 as placeholder. PRD says 998.
        name: 'HyperEVM',
        rpcUrl: 'https://rpc.hyperliquid.xyz/evm', // Common RPC
    }
};

export const CONTRACTS = {
    // These need to be verified.
    USDC_HYPEREVM: '0x0000000000000000000000000000000000000000', // Placeholder
    ASSET_BRIDGE: '0x0000000000000000000000000000000000000000', // Placeholder
};

export const LIMITS = {
    MINIMUM_DEPOSIT: 5.1, // $5 + buffer
    GAS_REFUEL_AMOUNT: 1.0, // $1 worth of HYPE
};
