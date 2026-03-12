interface LoadingSkeletonProps {
  lines?: number
  className?: string
}

export function LoadingSkeleton({ lines = 3, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-4"
          style={{ width: `${85 - i * 15}%` }}
        />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="glass p-6 space-y-4">
      <div className="skeleton h-5 w-2/3" />
      <div className="skeleton h-4 w-1/2" />
      <div className="flex gap-2 mt-4">
        <div className="skeleton h-8 w-8 rounded-full" />
        <div className="skeleton h-8 w-8 rounded-full" />
        <div className="skeleton h-8 w-8 rounded-full" />
      </div>
    </div>
  )
}
