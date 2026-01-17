import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger.js';
import type { ApiResponse } from '../types/index.js';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
    constructor(
        public statusCode: number,
        public code: string,
        message: string,
        public details?: unknown
    ) {
        super(message);
        this.name = 'ApiError';
    }

    static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown) {
        return new ApiError(400, code, message, details);
    }

    static unauthorized(message = 'Unauthorized') {
        return new ApiError(401, 'UNAUTHORIZED', message);
    }

    static forbidden(message = 'Forbidden') {
        return new ApiError(403, 'FORBIDDEN', message);
    }

    static notFound(message = 'Resource not found') {
        return new ApiError(404, 'NOT_FOUND', message);
    }

    static conflict(message: string) {
        return new ApiError(409, 'CONFLICT', message);
    }

    static internal(message = 'Internal server error') {
        return new ApiError(500, 'INTERNAL_ERROR', message);
    }
}

/**
 * Global error handler middleware
 */
export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    // Log the error
    logger.error({
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    }, 'Request error');

    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown;

    // Handle known error types
    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        code = err.code;
        message = err.message;
        details = err.details;
    } else if (err instanceof ZodError) {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = 'Validation failed';
        details = err.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
        }));
    } else if (err.name === 'SyntaxError') {
        statusCode = 400;
        code = 'INVALID_JSON';
        message = 'Invalid JSON in request body';
    }

    // Don't leak internal errors in production
    if (statusCode === 500 && process.env.NODE_ENV === 'production') {
        message = 'An unexpected error occurred';
        details = undefined;
    }

    const response: ApiResponse = {
        success: false,
        error: {
            code,
            message,
            details,
        },
        meta: {
            timestamp: new Date().toISOString(),
        },
    };

    res.status(statusCode).json(response);
}

/**
 * Not found handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
    const response: ApiResponse = {
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`,
        },
        meta: {
            timestamp: new Date().toISOString(),
        },
    };

    res.status(404).json(response);
}
