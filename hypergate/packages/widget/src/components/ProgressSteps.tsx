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
        <div className="w-full px-1 sm:px-2 py-2 sm:py-3">
            {/* ETA indicator during bridging */}
            {etaText && (
                <div className="flex items-center justify-center gap-1.5 mb-2 text-xs text-purple-600 font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>ETA: {etaText}</span>
                </div>
            )}
            <div className="flex items-center justify-between">
                {STEPS.map((step, index) => {
                    const status = getStepStatus(step, state, error);

                    return (
                        <div key={step.id} className="flex items-center flex-1">
                            {/* Step Circle */}
                            <div className="flex flex-col items-center">
                                <div
                                    className={`
                                        w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all duration-300
                                        ${status === 'completed' ? 'bg-green-500 text-white' : ''}
                                        ${status === 'current' ? 'bg-purple-600 text-white ring-2 sm:ring-4 ring-purple-600/30 animate-pulse' : ''}
                                        ${status === 'upcoming' ? 'bg-white/10 text-gray-500' : ''}
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
                                        mt-1 text-[9px] sm:text-[10px] font-medium transition-colors hidden xs:block
                                        ${status === 'completed' ? 'text-green-400' : ''}
                                        ${status === 'current' ? 'text-purple-400' : ''}
                                        ${status === 'upcoming' ? 'text-gray-600' : ''}
                                        ${status === 'error' ? 'text-red-400' : ''}
                                    `}
                                >
                                    {step.label}
                                </span>
                            </div>

                            {/* Connector Line */}
                            {index < STEPS.length - 1 && (
                                <div className="flex-1 mx-0.5 sm:mx-1">
                                    <div
                                        className={`
                                            h-0.5 transition-all duration-500
                                            ${status === 'completed' ? 'bg-green-500' : 'bg-white/10'}
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
