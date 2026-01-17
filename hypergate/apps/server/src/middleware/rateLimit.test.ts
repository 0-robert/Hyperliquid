import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { rateLimit } from './rateLimit.js';

// Mock the redis module
vi.mock('../lib/redis.js', () => ({
    getRedisClient: vi.fn().mockResolvedValue(null),
    isRedisAvailable: vi.fn().mockReturnValue(false),
}));

describe('rateLimit middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        vi.clearAllMocks();

        mockReq = {
            ip: '127.0.0.1',
            path: '/test',
            body: {},
            params: {},
        };

        mockRes = {
            setHeader: vi.fn(),
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };

        mockNext = vi.fn();
    });

    it('should allow requests under the limit', async () => {
        const limiter = rateLimit({
            windowMs: 60000,
            maxRequests: 10,
            keyPrefix: 'test',
        });

        await limiter(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 9);
    });

    it('should set rate limit headers', async () => {
        const limiter = rateLimit({
            windowMs: 60000,
            maxRequests: 100,
            keyPrefix: 'test-headers',
        });

        await limiter(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
    });

    it('should block requests over the limit', async () => {
        const limiter = rateLimit({
            windowMs: 60000,
            maxRequests: 2,
            keyPrefix: 'test-block',
        });

        // Make requests until blocked
        await limiter(mockReq as Request, mockRes as Response, mockNext);
        await limiter(mockReq as Request, mockRes as Response, mockNext);
        await limiter(mockReq as Request, mockRes as Response, mockNext);

        // The third request should be blocked
        expect(mockNext).toHaveBeenCalledTimes(3);
        // Third call should have an error
        const lastCall = (mockNext as ReturnType<typeof vi.fn>).mock.calls[2];
        expect(lastCall[0]).toBeDefined();
        expect(lastCall[0].message).toContain('Too many requests');
    });

    it('should use custom key generator', async () => {
        const customKeyGen = vi.fn().mockReturnValue('custom-key');

        const limiter = rateLimit({
            windowMs: 60000,
            maxRequests: 10,
            keyPrefix: 'test-custom',
            keyGenerator: customKeyGen,
        });

        await limiter(mockReq as Request, mockRes as Response, mockNext);

        expect(customKeyGen).toHaveBeenCalledWith(mockReq);
    });

    it('should use custom error message', async () => {
        const customMessage = 'Custom rate limit message';

        const limiter = rateLimit({
            windowMs: 60000,
            maxRequests: 1,
            keyPrefix: 'test-message',
            message: customMessage,
        });

        // First request succeeds
        await limiter(mockReq as Request, mockRes as Response, mockNext);
        // Second request should fail with custom message
        await limiter(mockReq as Request, mockRes as Response, mockNext);

        const lastCall = (mockNext as ReturnType<typeof vi.fn>).mock.calls[1];
        expect(lastCall[0].message).toBe(customMessage);
    });

    it('should track different IPs separately', async () => {
        const limiter = rateLimit({
            windowMs: 60000,
            maxRequests: 2,
            keyPrefix: 'test-ips',
        });

        // First IP makes 2 requests
        mockReq.ip = '192.168.1.1';
        await limiter(mockReq as Request, mockRes as Response, mockNext);
        await limiter(mockReq as Request, mockRes as Response, mockNext);

        // Second IP should still be allowed
        mockReq.ip = '192.168.1.2';
        await limiter(mockReq as Request, mockRes as Response, mockNext);

        // All should succeed (no error passed to next)
        const calls = (mockNext as ReturnType<typeof vi.fn>).mock.calls;
        expect(calls[0][0]).toBeUndefined();
        expect(calls[1][0]).toBeUndefined();
        expect(calls[2][0]).toBeUndefined();
    });
});

describe('preset rate limiters', () => {
    it('should export generalRateLimit', async () => {
        const { generalRateLimit } = await import('./rateLimit.js');
        expect(generalRateLimit).toBeDefined();
        expect(typeof generalRateLimit).toBe('function');
    });

    it('should export depositRateLimit', async () => {
        const { depositRateLimit } = await import('./rateLimit.js');
        expect(depositRateLimit).toBeDefined();
        expect(typeof depositRateLimit).toBe('function');
    });

    it('should export strictRateLimit', async () => {
        const { strictRateLimit } = await import('./rateLimit.js');
        expect(strictRateLimit).toBeDefined();
        expect(typeof strictRateLimit).toBe('function');
    });

    it('should export walletRateLimit', async () => {
        const { walletRateLimit } = await import('./rateLimit.js');
        expect(walletRateLimit).toBeDefined();
        expect(typeof walletRateLimit).toBe('function');
    });
});
