import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { rainbowWallet, metaMaskWallet, coinbaseWallet } from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http, createConnector } from 'wagmi';
import { mock } from 'wagmi/connectors';
import { arbitrum, mainnet, optimism, base } from 'wagmi/chains';
import { defineChain } from 'viem';


export const hyperEvm = defineChain({
    id: 999,
    name: 'HyperEVM',
    nativeCurrency: {
        decimals: 18,
        name: 'Hype',
        symbol: 'HYPE',
    },
    rpcUrls: {
        default: { http: ['https://rpc.hyperliquid.xyz/evm'] },
    },
    blockExplorers: {
        default: { name: 'HyperLiquid Explorer', url: 'https://hyperevm.org/explorer' },
    },
});

// 1. Create a Test Account
// 1. Create a Test Account (Impersonating a specific wealthy address for Demo)
// We use a string address so Wagmi doesn't try to derive it from a private key.
// Binance Hot Wallet 14 (Arbitrum Whale)
const TEST_ADDRESS = '0xF977814e90dA44bFA03b6295A0616a897441aceC';

// 2. Setup Connectors
const isDevelopment = import.meta.env.DEV;

const walletGroups = [
    // Only include Development group in dev mode
    ...(isDevelopment ? [{
        groupName: 'Development',
        wallets: [
            () => ({
                id: 'test-wallet',
                name: 'Test Wallet',
                iconUrl: 'https://cdn-icons-png.flaticon.com/512/9187/9187604.png',
                iconBackground: '#e0e0e0',
                installed: true,
                downloadUrls: {
                    android: 'https://example.com',
                    ios: 'https://example.com',
                    qrCode: 'https://example.com',
                },
                extension: {
                    instructions: {
                        learnMoreUrl: 'https://example.com',
                        steps: []
                    }
                },
                createConnector: (walletDetails: any) => {
                    // Create the base mock connector
                    const mockConnectorFn = mock({
                        accounts: [TEST_ADDRESS],
                        features: { reconnect: true },
                    });

                    return createConnector((config: any) => {
                        // Initialize the connector instance
                        const connector = mockConnectorFn(config);

                        // Override getProvider to inject our custom request handler
                        const originalGetProvider = connector.getProvider;
                        connector.getProvider = async () => {
                            const provider = await originalGetProvider();
                            const originalRequest = provider.request;

                            // Monkey-patch the request method
                            provider.request = async ({ method, params }: any) => {
                                console.log('[Mock Provider] Intercepting:', method, params);

                                if (method === 'eth_sendTransaction') {
                                    console.log('[Mock Provider] Simulating Success for:', method);
                                    // Return a random 32-byte hex string (fake tx hash)
                                    return '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
                                }

                                if (method === 'eth_estimateGas') {
                                    return '0x5208'; // 21000 gas
                                }

                                if (method === 'wallet_switchEthereumChain') {
                                    console.log('[Mock Provider] Simulating Chain Switch to:', params?.[0]?.chainId);
                                    return null; // Success
                                }

                                return originalRequest({ method, params });
                            };

                            return provider;
                        };

                        return {
                            ...connector,
                            ...walletDetails,
                        };
                    });
                }
            })
        ],
    }] : []),
    {
        groupName: 'Recommended',
        wallets: [rainbowWallet, metaMaskWallet, coinbaseWallet],
    },
];

const connectors = connectorsForWallets(
    walletGroups,
    {
        appName: 'HyperGate Demo',
        projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    }
);

// Conditional Configuration to respect user's "Separate Demo Changes" rule
// Dev: Limit chains to avoid 429 errors from public RPCs during heavy dev usage
// Prod: Full chain list
const chains = isDevelopment
    ? [mainnet, arbitrum, hyperEvm] as const
    : [mainnet, arbitrum, optimism, base, hyperEvm] as const;

const transports = isDevelopment
    ? {
        [mainnet.id]: http(),
        [arbitrum.id]: http(),
        [hyperEvm.id]: http(),
    }
    : {
        [mainnet.id]: http(),
        [arbitrum.id]: http(),
        [optimism.id]: http(),
        [base.id]: http(),
        [hyperEvm.id]: http(),
    };

export const config = createConfig({
    connectors,
    chains,
    transports,
    ssr: false,
});

