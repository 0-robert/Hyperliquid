import { useBridgeState, type BridgeState } from '../stores/useBridgeState';

interface Step {
    id: string;
    label: string;
    states: BridgeState[];
}

const STEPS: Step[] = [
    { id: 'select', label: 'Select', states: ['IDLE', 'QUOTING'] },
    { id: 'review', label: 'Review', states: ['SAFETY_GUARD'] },
    { id: 'bridge', label: 'Bridge', states: ['BRIDGING'] },
    { id: 'deposit', label: 'Deposit', states: ['DEPOSITING'] },
    { id: 'done', label: 'Done', states: ['SUCCESS'] },
];

/** Format duration in seconds to human-readable string */
function formatDuration(seconds: number): string {
    if (seconds <= 0) return '';
    if (seconds < 60) return `~${Math.round(seconds)}s`;
    const minutes = Math.round(seconds / 60);
    return `~${minutes}m`;
}

function getStepStatus(step: Step, currentState: BridgeState, error: string | null): 'completed' | 'current' | 'upcoming' | 'error' {
    const stepIndex = STEPS.findIndex(s => s.id === step.id);
    const currentStepIndex = STEPS.findIndex(s => s.states.includes(currentState));

    // Check for error in current step
    if (error && step.states.includes(currentState)) {
        return 'error';
    }

    if (stepIndex < currentStepIndex) {
        return 'completed';
    } else if (step.states.includes(currentState)) {
        return 'current';
    }
    return 'upcoming';
}

export function ProgressSteps() {
    const { state, error, safetyPayload } = useBridgeState();

    // Don't show progress bar in IDLE state (before user starts)
    if (state === 'IDLE') return null;

    // Show ETA during bridging if available
    const showEta = (state === 'BRIDGING' || state === 'QUOTING') && safetyPayload?.estimatedDuration;
    const etaText = showEta ? formatDuration(safetyPayload.estimatedDuration) : '';

    return (
    return (
        <div className="w-full px-4 py-4">
            <div className="flex items-start justify-between w-full relative">
                {/* Background Line (Absolute) to ensure perfect connection if we wanted, 
                    but flex Lines between items is safer for responsive spacing. 
                    Let's stick to flex lines between items. */}

                {STEPS.map((step, index) => {
                    const status = getStepStatus(step, state, error);
                    const isLast = index === STEPS.length - 1;

                    return (
                        <div key={step.id} className={`flex ${isLast ? '' : 'flex-1'} items-center`}>
                            {/* Step Circle & Label Container */}
                            <div className="flex flex-col items-center relative z-10 shrink-0">
                                <div
                                    className={`
                                        w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all duration-300
                                        ${status === 'completed' ? 'bg-green-500 text-white' : ''}
                                        ${status === 'current' ? 'bg-purple-600 text-white ring-4 ring-purple-600/30 animate-pulse' : ''}
                                        ${status === 'upcoming' ? 'bg-zinc-100 text-zinc-400' : ''}
                                        ${status === 'error' ? 'bg-red-500 text-white' : ''}
                                    `}
                                >
                                    {status === 'completed' ? (
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : status === 'error' ? (
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    ) : (
                                        index + 1
                                    )}
                                </div>
                                <span
                                    className={`
                                        absolute top-full mt-1.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors
                                        ${status === 'completed' ? 'text-green-500' : ''}
                                        ${status === 'current' ? 'text-purple-600' : ''}
                                        ${status === 'upcoming' ? 'text-zinc-300' : ''}
                                        ${status === 'error' ? 'text-red-500' : ''}
                                    `}
                                >
                                    {step.label}
                                </span>
                            </div>

                            {/* Connector Line (Not for last item) */}
                            {!isLast && (
                                <div className="flex-1 h-[2px] mx-2 mt-[-14px]">
                                    <div
                                        className={`
                                            h-full w-full rounded-full transition-all duration-500
                                            ${status === 'completed' ? 'bg-green-500' : 'bg-zinc-100'}
                                        `}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
