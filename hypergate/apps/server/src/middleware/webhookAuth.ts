import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { ApiError } from './errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Webhook signature header name
 */
export const WEBHOOK_SIGNATURE_HEADER = 'x-hypergate-signature';

/**
 * Webhook timestamp header name (for replay attack prevention)
 */
export const WEBHOOK_TIMESTAMP_HEADER = 'x-hypergate-timestamp';

/**
 * Maximum age of webhook request in seconds (5 minutes)
 */
const MAX_WEBHOOK_AGE_SECONDS = 300;

/**
 * Generate HMAC-SHA256 signature for webhook payload
 *
 * @param payload - The request body as a string
 * @param timestamp - Unix timestamp in seconds
 * @param secret - The webhook secret
 * @returns The HMAC signature as hex string
 */
export function generateWebhookSignature(
    payload: string,
    timestamp: number,
    secret: string
): string {
    const signaturePayload = `${timestamp}.${payload}`;
    return crypto
        .createHmac('sha256', secret)
        .update(signaturePayload)
        .digest('hex');
}

/**
 * Verify webhook signature using constant-time comparison
 *
 * @param payload - The request body as a string
 * @param timestamp - Unix timestamp from header
 * @param signature - The signature from header
 * @param secret - The webhook secret
 * @returns True if signature is valid
 */
export function verifyWebhookSignature(
    payload: string,
    timestamp: number,
    signature: string,
    secret: string
): boolean {
    const expectedSignature = generateWebhookSignature(payload, timestamp, secret);

    // Use constant-time comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    } catch {
        // If buffers have different lengths, comparison will throw
        return false;
    }
}

/**
 * Middleware to verify webhook authentication
 *
 * Validates:
 * 1. Presence of signature and timestamp headers
 * 2. Timestamp is within acceptable range (prevents replay attacks)
 * 3. HMAC-SHA256 signature matches payload
 *
 * Usage:
 * ```ts
 * app.post('/webhook', webhookAuth, (req, res) => { ... });
 * ```
 */
export function webhookAuth(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Skip authentication in development if no secret is configured
    if (!config.webhookSecret) {
        if (config.nodeEnv === 'development') {
            logger.warn('Webhook authentication disabled - WEBHOOK_SECRET not configured');
            return next();
        }
        throw ApiError.internal('Webhook secret not configured');
    }

    const signature = req.headers[WEBHOOK_SIGNATURE_HEADER] as string | undefined;
    const timestampHeader = req.headers[WEBHOOK_TIMESTAMP_HEADER] as string | undefined;

    // Validate headers presence
    if (!signature) {
        logger.warn({ path: req.path }, 'Webhook request missing signature header');
        throw ApiError.unauthorized('Missing webhook signature');
    }

    if (!timestampHeader) {
        logger.warn({ path: req.path }, 'Webhook request missing timestamp header');
        throw ApiError.unauthorized('Missing webhook timestamp');
    }

    // Parse and validate timestamp
    const timestamp = parseInt(timestampHeader, 10);
    if (isNaN(timestamp)) {
        throw ApiError.badRequest('Invalid webhook timestamp');
    }

    // Check for replay attacks (timestamp must be within acceptable range)
    const now = Math.floor(Date.now() / 1000);
    const age = Math.abs(now - timestamp);

    if (age > MAX_WEBHOOK_AGE_SECONDS) {
        logger.warn(
            { timestamp, now, age, maxAge: MAX_WEBHOOK_AGE_SECONDS },
            'Webhook request timestamp too old (possible replay attack)'
        );
        throw ApiError.unauthorized('Webhook timestamp expired');
    }

    // Get raw body for signature verification
    // Note: express.json() must be configured with `verify` option to preserve raw body
    const rawBody = (req as any).rawBody as string | undefined;

    if (!rawBody) {
        logger.error('Raw body not available for webhook verification');
        throw ApiError.internal('Webhook verification failed');
    }

    // Verify signature
    if (!verifyWebhookSignature(rawBody, timestamp, signature, config.webhookSecret)) {
        logger.warn(
            { path: req.path, signature: signature.substring(0, 10) + '...' },
            'Webhook signature verification failed'
        );
        throw ApiError.unauthorized('Invalid webhook signature');
    }

    logger.debug({ path: req.path }, 'Webhook signature verified');
    next();
}

/**
 * Express body parser verify function to preserve raw body
 *
 * Usage:
 * ```ts
 * app.use(express.json({
 *     verify: preserveRawBody
 * }));
 * ```
 */
export function preserveRawBody(
    req: Request,
    _res: Response,
    buf: Buffer,
    encoding: BufferEncoding
): void {
    (req as any).rawBody = buf.toString(encoding || 'utf8');
}
