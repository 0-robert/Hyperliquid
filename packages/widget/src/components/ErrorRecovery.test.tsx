import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorRecovery } from './ErrorRecovery';
import { useBridgeState } from '../stores/useBridgeState';

// Mock the store
vi.mock('../stores/useBridgeState', () => ({
    useBridgeState: vi.fn(),
}));

describe('ErrorRecovery', () => {
    const mockReset = vi.fn();
    const mockOnRetryBridge = vi.fn();
    const mockOnRetryDeposit = vi.fn();
    const mockOnCancel = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should not render when error is null', () => {
        (useBridgeState as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            error: null,
            reset: mockReset,
        });

        const { container } = render(
            <ErrorRecovery
                onRetryBridge={mockOnRetryBridge}
                onRetryDeposit={mockOnRetryDeposit}
                onCancel={mockOnCancel}
            />
        );

        expect(container.firstChild).toBeNull();
    });

    it('should render BRIDGE_FAILED error with retry button', () => {
        (useBridgeState as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            error: 'BRIDGE_FAILED',
            reset: mockReset,
        });

        render(
            <ErrorRecovery
                onRetryBridge={mockOnRetryBridge}
                onRetryDeposit={mockOnRetryDeposit}
                onCancel={mockOnCancel}
            />
        );

        expect(screen.getByText('Bridge Failed')).toBeDefined();
        expect(screen.getByText('Try Again')).toBeDefined();
        expect(screen.getByText('Cancel')).toBeDefined();
    });

    it('should call reset and onRetryBridge when Try Again is clicked for BRIDGE_FAILED', () => {
        (useBridgeState as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            error: 'BRIDGE_FAILED',
            reset: mockReset,
        });

        render(
            <ErrorRecovery
                onRetryBridge={mockOnRetryBridge}
                onRetryDeposit={mockOnRetryDeposit}
                onCancel={mockOnCancel}
            />
        );

        fireEvent.click(screen.getByText('Try Again'));

        expect(mockReset).toHaveBeenCalled();
        expect(mockOnRetryBridge).toHaveBeenCalled();
    });

    it('should render DEPOSIT_FAILED error with retry deposit button', () => {
        (useBridgeState as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            error: 'DEPOSIT_FAILED',
            reset: mockReset,
        });

        render(
            <ErrorRecovery
                onRetryBridge={mockOnRetryBridge}
                onRetryDeposit={mockOnRetryDeposit}
                onCancel={mockOnCancel}
            />
        );

        expect(screen.getByText('L1 Deposit Failed')).toBeDefined();
        expect(screen.getByText('Retry Deposit')).toBeDefined();
        expect(screen.getByText('Start Over')).toBeDefined();
    });

    it('should call onRetryDeposit when Retry Deposit is clicked', () => {
        (useBridgeState as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            error: 'DEPOSIT_FAILED',
            reset: mockReset,
        });

        render(
            <ErrorRecovery
                onRetryBridge={mockOnRetryBridge}
                onRetryDeposit={mockOnRetryDeposit}
                onCancel={mockOnCancel}
            />
        );

        fireEvent.click(screen.getByText('Retry Deposit'));

        expect(mockOnRetryDeposit).toHaveBeenCalled();
    });

    it('should render NO_GAS error with gas help', () => {
        (useBridgeState as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            error: 'NO_GAS',
            reset: mockReset,
        });

        render(
            <ErrorRecovery
                onRetryBridge={mockOnRetryBridge}
                onRetryDeposit={mockOnRetryDeposit}
                onCancel={mockOnCancel}
            />
        );

        expect(screen.getByText('Insufficient Gas')).toBeDefined();
        expect(screen.getByText('Get Gas')).toBeDefined();
        expect(screen.getByText('Retry')).toBeDefined();
    });

    it('should render BELOW_MINIMUM error', () => {
        (useBridgeState as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            error: 'BELOW_MINIMUM',
            reset: mockReset,
        });

        render(
            <ErrorRecovery
                onRetryBridge={mockOnRetryBridge}
                onRetryDeposit={mockOnRetryDeposit}
                onCancel={mockOnCancel}
            />
        );

        expect(screen.getByText('Amount Too Low')).toBeDefined();
        expect(screen.getByText('Start Over')).toBeDefined();
    });

    it('should call reset and onCancel when Cancel is clicked', () => {
        (useBridgeState as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            error: 'BRIDGE_FAILED',
            reset: mockReset,
        });

        render(
            <ErrorRecovery
                onRetryBridge={mockOnRetryBridge}
                onRetryDeposit={mockOnRetryDeposit}
                onCancel={mockOnCancel}
            />
        );

        fireEvent.click(screen.getByText('Cancel'));

        expect(mockReset).toHaveBeenCalled();
        expect(mockOnCancel).toHaveBeenCalled();
    });
});
