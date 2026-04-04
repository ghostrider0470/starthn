import { cn } from '@/lib/utils'

interface AzureIconProps {
  iconPath: string
  className?: string
}

export function AzureIcon({ iconPath, className }: AzureIconProps) {
  return (
    <img
      src={iconPath}
      alt=""
      className={cn('w-full h-full object-contain', className)}
      aria-hidden="true"
      loading="lazy"
      decoding="async"
    />
  )
}
