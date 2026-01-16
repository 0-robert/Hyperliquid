import { create } from 'zustand';

export type BridgeState =
    | 'IDLE'           // Initial: User selecting chain/amount
    | 'QUOTING'        // Loading best route from LI.FI
    | 'BRIDGING'       // Step 1: Cross-chain transfer in progress
    | 'DEPOSITING'     // Step 2: EVM -> L1 deposit in progress
    | 'SUCCESS';       // Funds live in trading account

export type ErrorState =
    | 'BELOW_MINIMUM'  // Amount < $5 (hard block)
    | 'NO_GAS'         // User has 0 HYPE for Step 2
    | 'BRIDGE_FAILED'  // Step 1 failed (show retry)
    | 'DEPOSIT_FAILED' // Step 2 failed (show rescue button)
    | null;

interface BridgeStore {
    state: BridgeState;
    error: ErrorState;
    setState: (state: BridgeState) => void;
    setError: (error: ErrorState) => void;
    reset: () => void;
}

export const useBridgeState = create<BridgeStore>((set) => ({
    state: 'IDLE',
    error: null,
    setState: (state) => set({ state }),
    setError: (error) => set({ error }),
    reset: () => set({ state: 'IDLE', error: null }),
}));
