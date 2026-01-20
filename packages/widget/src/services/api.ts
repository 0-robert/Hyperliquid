import { API } from '../config/constants';

// =============================================================================
// Webhook Signing (for authenticated requests)
// =============================================================================

const WEBHOOK_SIGNATURE_HEADER = 'x-hypergate-signature';
const WEBHOOK_TIMESTAMP_HEADER = 'x-hypergate-timestamp';

/**
 * Get webhook secret from environment
 */
function getWebhookSecret(): string | undefined {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return (import.meta.env as Record<string, string>).VITE_WEBHOOK_SECRET;
    }
    return undefined;
}

/**
 * Generate HMAC-SHA256 signature using Web Crypto API
 */
async function generateSignature(payload: string, timestamp: number, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const signaturePayload = `${timestamp}.${payload}`;

    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signaturePayload));
    return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// =============================================================================
// Types
// =============================================================================

export interface Deposit {
    id: string;
    userAddress: string;
    sourceChain: string;
    sourceToken: string;
    sourceAmount: string;
    destinationAmount: string;
    bridgeTxHash?: string;
    depositTxHash?: string;
    status: 'PENDING' | 'BRIDGING' | 'DEPOSITING' | 'COMPLETED' | 'FAILED';
    errorMessage?: string;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
}

export interface CreateDepositRequest {
    userAddress: string;
    sourceChain: string;
    sourceToken: string;
    sourceAmount: string;
    expectedDestinationAmount: string;
}

// =============================================================================
// API Client
// =============================================================================

class ApiClient {
    private baseUrl: string;

    constructor() {
        this.baseUrl = API.BASE_URL;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || {
                        code: 'REQUEST_FAILED',
                        message: `Request failed with status ${response.status}`,
                    },
                };
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            return {
                success: false,
                error: {
                    code: 'NETWORK_ERROR',
                    message: error instanceof Error ? error.message : 'Network error occurred',
                },
            };
        }
    }

    /**
     * Make a signed webhook request with HMAC authentication
     */
    private async signedRequest<T>(
        endpoint: string,
        body: object
    ): Promise<ApiResponse<T>> {
        const secret = getWebhookSecret();
        const payload = JSON.stringify(body);
        const timestamp = Math.floor(Date.now() / 1000);

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Add signature headers if secret is configured
        if (secret) {
            const signature = await generateSignature(payload, timestamp, secret);
            headers[WEBHOOK_SIGNATURE_HEADER] = signature;
            headers[WEBHOOK_TIMESTAMP_HEADER] = timestamp.toString();
        }

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers,
                body: payload,
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || {
                        code: 'REQUEST_FAILED',
                        message: `Request failed with status ${response.status}`,
                    },
                };
            }

            return data;
        } catch (error) {
            console.error('Signed API request failed:', error);
            return {
                success: false,
                error: {
                    code: 'NETWORK_ERROR',
                    message: error instanceof Error ? error.message : 'Network error occurred',
                },
            };
        }
    }

    /**
     * Create a new deposit record
     */
    async createDeposit(data: CreateDepositRequest): Promise<ApiResponse<Deposit>> {
        return this.request<Deposit>('/api/deposits', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Get deposit by ID
     */
    async getDeposit(id: string): Promise<ApiResponse<Deposit>> {
        return this.request<Deposit>(`/api/deposits/${id}`);
    }

    /**
     * Get deposits for a user address
     */
    async getUserDeposits(
        address: string,
        page = 1,
        limit = 10
    ): Promise<ApiResponse<Deposit[]>> {
        return this.request<Deposit[]>(
            `/api/deposits/user/${address}?page=${page}&limit=${limit}`
        );
    }

    /**
     * Notify backend that bridge step completed (signed webhook)
     */
    async notifyBridgeSuccess(
        depositId: string,
        bridgeTxHash: string,
        amount?: string
    ): Promise<ApiResponse<Deposit>> {
        return this.signedRequest<Deposit>('/api/deposits/bridge-success', {
            depositId,
            bridgeTxHash,
            amount,
        });
    }

    /**
     * Notify backend that L1 deposit completed (signed webhook)
     */
    async notifyL1Success(
        depositId: string,
        depositTxHash: string,
        amount?: string
    ): Promise<ApiResponse<Deposit>> {
        return this.signedRequest<Deposit>('/api/deposits/l1-success', {
            depositId,
            depositTxHash,
            amount,
        });
    }

    /**
     * Verify a transaction on-chain via backend
     */
    async verifyTransaction(
        txHash: string,
        expectedAmount?: string
    ): Promise<ApiResponse<{ verified: boolean; error?: string }>> {
        return this.request('/api/deposits/verify', {
            method: 'POST',
            body: JSON.stringify({ txHash, expectedAmount }),
        });
    }

    /**
     * Check if API is available
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/health/live`);
            return response.ok;
        } catch {
            return false;
        }
    }
}

// Singleton instance
export const apiClient = new ApiClient();
export default apiClient;
