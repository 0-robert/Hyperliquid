// Main Component
export { HyperGate } from './HyperGate';

// Types for consumers
export type {
    HyperGateProps,
    HyperGateTheme,
    HyperGateCallbacks,
} from './HyperGate';

// State management (for advanced usage)
export * from './stores/useBridgeState';

// API types
export type { Deposit, ApiResponse } from './services/api';
