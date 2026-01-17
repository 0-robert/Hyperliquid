import { Router, type Request, type Response } from 'express';
import blockchainService from '../services/blockchain.js';
import type { HealthStatus, ApiResponse } from '../types/index.js';

const router = Router();
const startTime = Date.now();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/', async (_req: Request, res: Response) => {
    const blockchainHealthy = await blockchainService.healthCheck();

    const health: HealthStatus = {
        status: blockchainHealthy ? 'healthy' : 'degraded',
        version: process.env.npm_package_version || '1.0.0',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        timestamp: new Date().toISOString(),
        services: {
            database: 'unknown', // TODO: Add database health check
            redis: 'unknown',    // TODO: Add Redis health check
            blockchain: blockchainHealthy ? 'connected' : 'disconnected',
        },
    };

    const response: ApiResponse<HealthStatus> = {
        success: true,
        data: health,
        meta: {
            timestamp: new Date().toISOString(),
        },
    };

    res.status(health.status === 'healthy' ? 200 : 503).json(response);
});

/**
 * Liveness probe (for Kubernetes)
 * GET /health/live
 */
router.get('/live', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'alive' });
});

/**
 * Readiness probe (for Kubernetes)
 * GET /health/ready
 */
router.get('/ready', async (_req: Request, res: Response) => {
    const blockchainHealthy = await blockchainService.healthCheck();

    if (blockchainHealthy) {
        res.status(200).json({ status: 'ready' });
    } else {
        res.status(503).json({ status: 'not ready', reason: 'blockchain disconnected' });
    }
});

export default router;
