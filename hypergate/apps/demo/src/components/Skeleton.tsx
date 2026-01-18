/**
 * Skeleton loading components for progressive loading
 */

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div 
      className={`
        animate-pulse bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 
        bg-[length:200%_100%] 
        rounded-lg
        ${className}
      `}
      style={{
        animation: 'shimmer 1.5s ease-in-out infinite',
      }}
    />
  );
}

/**
 * Skeleton for the widget when loading
 */
export function WidgetSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      {/* Token selector skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-20" />
        <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      </div>

      {/* Amount input skeleton */}
      <div className="space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="p-4 bg-zinc-50 rounded-2xl">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>

      {/* Arrow */}
      <div className="flex justify-center">
        <Skeleton className="w-10 h-10 rounded-full" />
      </div>

      {/* Destination skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>

      {/* Route info skeleton */}
      <div className="p-4 bg-zinc-50 rounded-2xl space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Button skeleton */}
      <Skeleton className="h-14 w-full rounded-full" />
    </div>
  );
}

/**
 * Skeleton for transaction history item
 */
export function TransactionSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-zinc-100">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  );
}

/**
 * Skeleton for balance display
 */
export function BalanceSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

// Add shimmer animation to global styles
const shimmerStyle = `
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = shimmerStyle;
  document.head.appendChild(styleSheet);
}
