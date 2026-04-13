import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface BlogPostCardSkeletonProps {
  compact?: boolean
  className?: string
}

export function BlogPostCardSkeleton({
  compact = false,
  className,
}: BlogPostCardSkeletonProps) {
  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-xl border bg-card',
        className,
      )}
      aria-hidden
    >
      <Skeleton className="aspect-[16/9] w-full rounded-none" />

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-2.5 flex items-center gap-2">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-16" />
        </div>

        <Skeleton className={cn(compact ? 'h-5 w-5/6' : 'h-6 w-full', 'mb-1.5')} />
        <Skeleton className="mb-3 h-6 w-2/3" />

        {!compact && (
          <div className="mb-4 space-y-1.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 border-t border-border/40 pt-3">
          <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
          <Skeleton className="h-3.5 w-24" />
        </div>
      </div>
    </div>
  )
}
