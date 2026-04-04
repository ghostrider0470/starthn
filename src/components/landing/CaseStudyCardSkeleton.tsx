import { StandardCard } from '@/components/ui/standard-card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface CaseStudyCardSkeletonProps {
  className?: string
}

export function CaseStudyCardSkeleton({
  className,
}: CaseStudyCardSkeletonProps) {
  return (
    <StandardCard
      variant="default"
      className={cn('h-full', className)}
      aria-hidden
    >
      <div className="mb-4">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-7 w-11/12" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 border-y py-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={`metric-${index}`}>
            <Skeleton className="mb-2 h-6 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={`stack-${index}`} className="h-6 w-16 rounded-full" />
        ))}
      </div>

      <Skeleton className="mt-auto h-11 w-full" />
    </StandardCard>
  )
}
