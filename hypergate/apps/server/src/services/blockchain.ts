import { createPublicClient, http, parseAbi, type PublicClient } from 'viem';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import type { TransferEvent, DepositDetectedEvent } from '../types/index.js';

// ERC20 ABI for Transfer events and balanceOf
const ERC20_ABI = parseAbi([
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
]);

/**
 * Blockchain service for interacting with HyperEVM
 */
export class BlockchainService {
    private client: PublicClient;
    private eventCallbacks: Set<(event: DepositDetectedEvent) => void> = new Set();

    constructor() {
        this.client = createPublicClient({
            transport: http(config.rpcUrl),
        });
        logger.info({ rpcUrl: config.rpcUrl }, 'Blockchain service initialized');
    }

    /**
     * Verify a transaction exists and matches expected parameters
     */
    async verifyTransaction(
        txHash: `0x${string}`,
        expectedAmount?: bigint,
        _expectedRecipient?: `0x${string}`
    ): Promise<{
        verified: boolean;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        receipt?: any;
        error?: string;
    }> {
        try {
            const receipt = await this.client.getTransactionReceipt({ hash: txHash });

            if (!receipt) {
                return { verified: false, error: 'Transaction not found' };
            }

            if (receipt.status !== 'success') {
                return { verified: false, error: 'Transaction failed', receipt };
            }

            // Parse Transfer events from logs
            const transferEvents = receipt.logs
                .filter(log => log.address.toLowerCase() === config.usdcAddress.toLowerCase())
                .map(log => {
                    try {
                        // Decode Transfer event
                        const from = `0x${log.topics[1]?.slice(26)}` as `0x${string}`;
                        const to = `0x${log.topics[2]?.slice(26)}` as `0x${string}`;
                        const value = BigInt(log.data);
                        return { from, to, value };
                    } catch {
                        return null;
                    }
                })
                .filter(Boolean);

            // Check if bridge received the expected amount
            const bridgeTransfer = transferEvents.find(
                t => t && t.to.toLowerCase() === config.bridgeAddress.toLowerCase()
            );

            if (!bridgeTransfer) {
                return { verified: false, error: 'No transfer to bridge found', receipt };
            }

            if (expectedAmount && bridgeTransfer.value !== expectedAmount) {
                return {
                    verified: false,
                    error: `Amount mismatch: expected ${expectedAmount}, got ${bridgeTransfer.value}`,
                    receipt,
                };
            }

            return { verified: true, receipt };
        } catch (error) {
            logger.error({ error, txHash }, 'Failed to verify transaction');
            return { verified: false, error: String(error) };
        }
    }

    /**
     * Get USDC balance for an address
     */
    async getUSDCBalance(address: `0x${string}`): Promise<bigint> {
        try {
            const balance = await this.client.readContract({
                address: config.usdcAddress,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [address],
            });
            return balance;
        } catch (error) {
            logger.error({ error, address }, 'Failed to get USDC balance');
            throw error;
        }
    }

    /**
     * Get current block number
     */
    async getBlockNumber(): Promise<bigint> {
        return this.client.getBlockNumber();
    }

    /**
     * Check if the RPC connection is healthy
     */
    async healthCheck(): Promise<boolean> {
        try {
            await this.client.getBlockNumber();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Watch for Transfer events to the Asset Bridge
     * This enables real-time deposit detection
     */
    async watchBridgeDeposits(): Promise<() => void> {
        logger.info('Starting to watch for bridge deposits...');

        const unwatch = this.client.watchContractEvent({
            address: config.usdcAddress,
            abi: ERC20_ABI,
            eventName: 'Transfer',
            args: {
                to: config.bridgeAddress,
            },
            onLogs: (logs) => {
                for (const log of logs) {
                    const event: DepositDetectedEvent = {
                        txHash: log.transactionHash!,
                        userAddress: `0x${log.topics[1]?.slice(26)}` as `0x${string}`,
                        amount: BigInt(log.data),
                        blockNumber: log.blockNumber!,
                        timestamp: Date.now(),
                    };

                    logger.info({ event }, 'Deposit detected');

                    // Notify all registered callbacks
                    this.eventCallbacks.forEach(callback => {
                        try {
                            callback(event);
                        } catch (error) {
                            logger.error({ error }, 'Error in deposit event callback');
                        }
                    });
                }
            },
            onError: (error) => {
                logger.error({ error }, 'Error watching bridge deposits');
            },
        });

        return unwatch;
    }

    /**
     * Register a callback for deposit events
     */
    onDeposit(callback: (event: DepositDetectedEvent) => void): () => void {
        this.eventCallbacks.add(callback);
        return () => this.eventCallbacks.delete(callback);
    }

    /**
     * Get historical Transfer events to bridge
     */
    async getHistoricalDeposits(
        fromBlock: bigint,
        toBlock?: bigint
    ): Promise<TransferEvent[]> {
        const logs = await this.client.getContractEvents({
            address: config.usdcAddress,
            abi: ERC20_ABI,
            eventName: 'Transfer',
            args: {
                to: config.bridgeAddress,
            },
            fromBlock,
            toBlock: toBlock || 'latest',
        });

        return logs.map(log => ({
            blockNumber: log.blockNumber!,
            blockHash: log.blockHash!,
            transactionHash: log.transactionHash!,
            from: log.args.from as `0x${string}`,
            to: log.args.to as `0x${string}`,
            value: log.args.value as bigint,
        }));
    }
}

// Singleton instance
export const blockchainService = new BlockchainService();
export default blockchainService;
