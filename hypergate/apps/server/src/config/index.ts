import dotenv from 'dotenv';
import { ServerConfig } from '../types/index.js';

// Load environment variables
dotenv.config();

/**
 * Server configuration loaded from environment variables
 */
export const config: ServerConfig = {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: (process.env.NODE_ENV as ServerConfig['nodeEnv']) || 'development',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5174'],
    rpcUrl: process.env.RPC_URL || 'https://rpc.hyperliquid.xyz/evm',
    usdcAddress: (process.env.USDC_ADDRESS || '0xb88339cb01e41113264632ba630f') as `0x${string}`,
    bridgeAddress: (process.env.BRIDGE_ADDRESS || '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7') as `0x${string}`,
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    logLevel: (process.env.LOG_LEVEL as ServerConfig['logLevel']) || 'info',
};

/**
 * Validate critical configuration
 */
export function validateConfig(): void {
    const errors: string[] = [];

    // Check for placeholder addresses
    if (config.usdcAddress === '0x0000000000000000000000000000000000000000') {
        errors.push('USDC_ADDRESS is set to burn address - this will lose funds!');
    }

    if (config.bridgeAddress === '0x0000000000000000000000000000000000000000') {
        errors.push('BRIDGE_ADDRESS is set to burn address - this will lose funds!');
    }

    // Validate RPC URL
    if (!config.rpcUrl.startsWith('http')) {
        errors.push('RPC_URL must be a valid HTTP(S) URL');
    }

    // Production checks
    if (config.nodeEnv === 'production') {
        if (!config.databaseUrl) {
            errors.push('DATABASE_URL is required in production');
        }
        if (config.corsOrigins.includes('http://localhost:5173')) {
            console.warn('Warning: CORS allows localhost in production');
        }
    }

    if (errors.length > 0) {
        console.error('Configuration errors:');
        errors.forEach(err => console.error(`  - ${err}`));
        if (config.nodeEnv === 'production') {
            throw new Error('Invalid configuration for production');
        }
    }
}

export default config;
