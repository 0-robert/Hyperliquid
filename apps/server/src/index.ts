import config, { validateConfig } from './config/index.js';
import logger from './utils/logger.js';
import blockchainService from './services/blockchain.js';
import depositService from './services/deposits.js';
import { getRedisClient, disconnectRedis } from './lib/redis.js';
import app from './app.js';

// Validate configuration on startup
validateConfig();

// =============================================================================
// Server Startup
// =============================================================================

async function startServer() {
    try {
        // Initialize Redis for rate limiting (optional)
        if (config.redisUrl) {
            const redis = await getRedisClient();
            if (redis) {
                logger.info('Redis connected for rate limiting');
            } else {
                logger.info('Redis not available, using in-memory rate limiting');
            }
        } else {
            logger.info('REDIS_URL not configured, using in-memory rate limiting');
        }

        // Start watching for blockchain events
        if (config.nodeEnv !== 'test') {
            const unwatch = await blockchainService.watchBridgeDeposits();

            // Register deposit event handler
            blockchainService.onDeposit(async (event) => {
                logger.info({ event }, 'Processing deposit event');

                // Try to find matching pending deposit
                const existingDeposit = await depositService.getByTxHash(event.txHash);

                if (existingDeposit) {
                    // Update existing deposit
                    await depositService.updateStatus(existingDeposit.id, {
                        txHash: event.txHash,
                        status: 'COMPLETED',
                    });
                } else {
                    // Create new deposit record (for deposits not initiated through our UI)
                    await depositService.create({
                        userAddress: event.userAddress,
                        sourceChain: 'unknown',
                        sourceToken: 'USDC',
                        sourceAmount: event.amount.toString(),
                        expectedDestinationAmount: event.amount.toString(),
                    });
                }
            });

            // Cleanup handler
            process.on('SIGINT', async () => {
                logger.info('Shutting down...');
                unwatch();
                await disconnectRedis();
                process.exit(0);
            });

            process.on('SIGTERM', async () => {
                logger.info('Shutting down...');
                unwatch();
                await disconnectRedis();
                process.exit(0);
            });
        }

        // Start periodic cleanup of stale deposits
        setInterval(async () => {
            await depositService.cleanupStaleDeposits(30);
        }, 5 * 60 * 1000); // Every 5 minutes

        // Start HTTP server
        app.listen(config.port, () => {
            logger.info({
                port: config.port,
                env: config.nodeEnv,
                corsOrigins: config.corsOrigins,
            }, `🚀 HyperGate API server running on port ${config.port}`);
        });

    } catch (error) {
        logger.fatal({ error }, 'Failed to start server');
        process.exit(1);
    }
}

startServer();

export default app;
