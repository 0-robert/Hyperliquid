import { createClient, RedisClientType } from 'redis';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let redisClient: RedisClientType | null = null;
let isConnected = false;

/**
 * Get or create Redis client singleton
 */
export async function getRedisClient(): Promise<RedisClientType | null> {
    if (!config.redisUrl) {
        return null;
    }

    if (redisClient && isConnected) {
        return redisClient;
    }

    try {
        redisClient = createClient({
            url: config.redisUrl,
            socket: {
                connectTimeout: 5000,
                reconnectStrategy: (retries) => {
                    if (retries > 3) {
                        logger.warn('Redis connection failed after 3 retries, falling back to in-memory');
                        return false;
                    }
                    return Math.min(retries * 100, 3000);
                },
            },
        });

        redisClient.on('error', (err) => {
            logger.error({ error: err.message }, 'Redis client error');
            isConnected = false;
        });

        redisClient.on('connect', () => {
            logger.info('Redis client connected');
            isConnected = true;
        });

        redisClient.on('disconnect', () => {
            logger.warn('Redis client disconnected');
            isConnected = false;
        });

        await redisClient.connect();
        return redisClient;
    } catch (error) {
        logger.warn({ error }, 'Failed to connect to Redis, will use in-memory rate limiting');
        redisClient = null;
        return null;
    }
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
    return isConnected && redisClient !== null;
}

/**
 * Disconnect Redis client
 */
export async function disconnectRedis(): Promise<void> {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        isConnected = false;
    }
}

export { redisClient };
