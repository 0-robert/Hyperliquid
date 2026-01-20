import { create } from 'zustand';

export type BridgeState =
    | 'IDLE'           // Initial: User selecting chain/amount
    | 'QUOTING'        // Loading best route from LI.FI
    | 'BRIDGING'       // Step 1: Cross-chain transfer in progress
    | 'DEPOSITING'     // Step 2: EVM -> L1 deposit in progress
    | 'SAFETY_GUARD'   // Interception: Confirmation required
    | 'AMOUNT_MISMATCH' // Bridge delivered less than expected - needs confirmation
    | 'SUCCESS';       // Funds live in trading account

export type ErrorState =
    | 'BELOW_MINIMUM'  // Amount < $5 (hard block)
    | 'NO_GAS'         // User has 0 HYPE for Step 2
    | 'BRIDGE_FAILED'  // Step 1 failed (show retry)
    | 'DEPOSIT_FAILED' // Step 2 failed (show rescue button)
    | null;

export interface SafetyGuardPayload {
    inputAmount: number;
    bridgeFee: number;
    gasCost: number;
    netAmount: number;
    isSafe: boolean;
    /** Estimated execution duration in seconds */
    estimatedDuration: number;
}

export interface AmountMismatchPayload {
    /** Amount the bridge route promised (in smallest units) */
    expectedAmount: bigint;
    /** Actual balance received (in smallest units) */
    actualAmount: bigint;
    /** Expected amount in USD */
    expectedUSD: number;
    /** Actual amount in USD */
    actualUSD: number;
    /** Difference as percentage */
    differencePercent: number;
}

interface BridgeStore {
    state: BridgeState;
    error: ErrorState;
    safetyPayload: SafetyGuardPayload | null;
    amountMismatchPayload: AmountMismatchPayload | null;
    setState: (state: BridgeState) => void;
    setError: (error: ErrorState) => void;
    setSafetyPayload: (payload: SafetyGuardPayload | null) => void;
    setAmountMismatchPayload: (payload: AmountMismatchPayload | null) => void;
    reset: () => void;
}

export const useBridgeState = create<BridgeStore>((set) => ({
    state: 'IDLE',
    error: null,
    safetyPayload: null,
    amountMismatchPayload: null,
    setState: (state) => set({ state }),
    setError: (error) => set({ error }),
    setSafetyPayload: (payload) => set({ safetyPayload: payload }),
    setAmountMismatchPayload: (payload) => set({ amountMismatchPayload: payload }),
    reset: () => set({ state: 'IDLE', error: null, safetyPayload: null, amountMismatchPayload: null }),
}));
