import { z } from 'zod';

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Deposit record schema for validation
 */
export const DepositSchema = z.object({
    id: z.string().uuid(),
    userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    sourceChain: z.string(),
    sourceToken: z.string(),
    sourceAmount: z.string(),
    destinationAmount: z.string(),
    bridgeTxHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
    depositTxHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
    status: z.enum(['PENDING', 'BRIDGING', 'DEPOSITING', 'COMPLETED', 'FAILED']),
    errorMessage: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    completedAt: z.date().optional(),
});

export type Deposit = z.infer<typeof DepositSchema>;

/**
 * Create deposit request
 */
export const CreateDepositRequestSchema = z.object({
    userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
    sourceChain: z.string().min(1),
    sourceToken: z.string().min(1),
    sourceAmount: z.string().min(1),
    expectedDestinationAmount: z.string().min(1),
});

export type CreateDepositRequest = z.infer<typeof CreateDepositRequestSchema>;

/**
 * Update deposit status request
 */
export const UpdateDepositStatusSchema = z.object({
    txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
    status: z.enum(['BRIDGING', 'DEPOSITING', 'COMPLETED', 'FAILED']),
    errorMessage: z.string().optional(),
});

export type UpdateDepositStatus = z.infer<typeof UpdateDepositStatusSchema>;

/**
 * Verify transaction request
 */
export const VerifyTransactionRequestSchema = z.object({
    txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
    expectedAmount: z.string().optional(),
    expectedRecipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

export type VerifyTransactionRequest = z.infer<typeof VerifyTransactionRequestSchema>;

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
    meta?: {
        timestamp: string;
        requestId?: string;
    };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// ============================================================================
// Blockchain Event Types
// ============================================================================

export interface TransferEvent {
    blockNumber: bigint;
    blockHash: `0x${string}`;
    transactionHash: `0x${string}`;
    from: `0x${string}`;
    to: `0x${string}`;
    value: bigint;
    timestamp?: number;
}

export interface DepositDetectedEvent {
    txHash: `0x${string}`;
    userAddress: `0x${string}`;
    amount: bigint;
    blockNumber: bigint;
    timestamp: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ServerConfig {
    port: number;
    nodeEnv: 'development' | 'production' | 'test';
    corsOrigins: string[];
    rpcUrl: string;
    usdcAddress: `0x${string}`;
    bridgeAddress: `0x${string}`;
    databaseUrl?: string;
    redisUrl?: string;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    uptime: number;
    timestamp: string;
    services: {
        database: 'connected' | 'disconnected' | 'unknown';
        redis: 'connected' | 'disconnected' | 'unknown';
        blockchain: 'connected' | 'disconnected' | 'unknown';
    };
}
