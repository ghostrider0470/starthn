import { Volume2, VolumeX, Volume1 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface SoundToggleProps {
  isEnabled: boolean
  volume: number
  onToggle: () => void
  onVolumeChange?: (volume: number) => void
  className?: string
  showVolumeSlider?: boolean
}

/**
 * CRT-styled sound toggle button with optional volume control
 */
export function SoundToggle({
  isEnabled,
  volume,
  onToggle,
  onVolumeChange,
  className,
  showVolumeSlider = false,
}: SoundToggleProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showSlider, setShowSlider] = useState(false)

  const VolumeIcon = !isEnabled ? VolumeX : volume > 0.5 ? Volume2 : Volume1

  return (
    <div
      className={cn('relative inline-flex items-center gap-2', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setShowSlider(false)
      }}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        onContextMenu={(e) => {
          e.preventDefault()
          if (showVolumeSlider) setShowSlider(!showSlider)
        }}
        className={cn(
          'relative h-9 w-9 rounded-lg',
          'border border-primary/20 bg-background/80 backdrop-blur-sm',
          'hover:bg-primary/10 hover:border-primary/40',
          'transition-all duration-200',
          isEnabled && 'border-primary/40 shadow-sm shadow-primary/20',
          'group'
        )}
        title={isEnabled ? 'Disable CRT sounds (right-click for volume)' : 'Enable CRT sounds'}
      >
        {/* Scanline effect on icon */}
        <div
          className={cn(
            'absolute inset-0 rounded-lg pointer-events-none opacity-0 group-hover:opacity-100',
            'transition-opacity duration-200'
          )}
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent 0px, transparent 1px, rgba(255,107,53,0.05) 1px, rgba(255,107,53,0.05) 2px)',
          }}
        />

        <VolumeIcon
          className={cn(
            'h-4 w-4 transition-all duration-200 relative z-10',
            isEnabled ? 'text-primary' : 'text-muted-foreground',
            isHovered && 'scale-110'
          )}
        />

        {/* Active indicator dot */}
        {isEnabled && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
        )}
      </Button>

      {/* Volume slider (optional) */}
      {showVolumeSlider && showSlider && onVolumeChange && (
        <div
          className={cn(
            'absolute top-full mt-2 left-1/2 -translate-x-1/2',
            'p-3 rounded-lg',
            'bg-card/95 backdrop-blur-sm border border-primary/20',
            'shadow-lg shadow-primary/10',
            'z-50'
          )}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">VOL</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className={cn(
                'w-20 h-1 rounded-full appearance-none cursor-pointer',
                'bg-muted',
                '[&::-webkit-slider-thumb]:appearance-none',
                '[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3',
                '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary',
                '[&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:shadow-primary/50',
                '[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3',
                '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary',
                '[&::-moz-range-thumb]:border-0'
              )}
            />
            <span className="font-mono text-xs text-primary">{Math.round(volume * 100)}%</span>
          </div>
        </div>
      )}

      {/* Status label on hover */}
      {isHovered && (
        <span
          className={cn(
            'absolute -bottom-6 left-1/2 -translate-x-1/2',
            'font-mono text-[10px] whitespace-nowrap',
            'px-1.5 py-0.5 rounded',
            'bg-card/90 border border-primary/20',
            isEnabled ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {isEnabled ? 'SFX: ON' : 'SFX: OFF'}
        </span>
      )}
    </div>
  )
}

/**
 * Minimal inline sound toggle for compact spaces
 */
export function SoundToggleInline({
  isEnabled,
  onToggle,
  className,
}: Pick<SoundToggleProps, 'isEnabled' | 'onToggle' | 'className'>) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded',
        'font-mono text-xs',
        'border transition-all duration-200',
        isEnabled
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-muted bg-muted/50 text-muted-foreground hover:border-primary/20',
        className
      )}
    >
      {isEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
      <span>{isEnabled ? 'ON' : 'OFF'}</span>
    </button>
  )
}
