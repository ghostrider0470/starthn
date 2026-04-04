import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react'

interface EvolutionControlsProps {
  generation: number
  timeLeft: number
  isPaused: boolean
  survivorCount: number
  totalCount: number
  averageColor: { r: number; g: number; b: number }
  mutationRate: number
  timerDuration: number
  onTogglePause: () => void
  onReset: () => void
  onNextGeneration: () => void
  onMutationRateChange: (rate: number) => void
  onTimerDurationChange: (duration: number) => void
  minTimerDuration: number
  maxTimerDuration: number
}

export function EvolutionControls({
  generation,
  timeLeft,
  isPaused,
  survivorCount,
  totalCount,
  averageColor,
  mutationRate,
  timerDuration,
  onTogglePause,
  onReset,
  onNextGeneration,
  onMutationRateChange,
  onTimerDurationChange,
  minTimerDuration,
  maxTimerDuration,
}: EvolutionControlsProps) {
  const avgColor = `rgb(${Math.round(averageColor.r)}, ${Math.round(averageColor.g)}, ${Math.round(averageColor.b)})`
  const mutationPercentage = Math.round((mutationRate * 100))
  const timePercentage = (timeLeft / timerDuration) * 100
  const survivalRate = Math.round((survivorCount / totalCount) * 100)

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Stats & Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* Compact Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Generation</div>
            <div className="text-2xl font-bold">{generation}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Survivors</div>
            <div className="text-2xl font-bold">
              {survivorCount}<span className="text-sm text-muted-foreground">/{totalCount}</span>
            </div>
          </div>
        </div>

        {/* Time with Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-muted-foreground">Time Left</span>
            <span className={cn(
              "text-lg font-bold tabular-nums",
              timeLeft <= 5 && !isPaused && "text-destructive animate-pulse"
            )}>
              {timeLeft}s
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-1000 ease-linear",
                timeLeft <= 5 ? "bg-destructive" : "bg-primary"
              )}
              style={{ width: `${timePercentage}%` }}
            />
          </div>
        </div>

        {/* Average Color - Compact */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Avg Color</span>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border border-border"
              style={{ backgroundColor: avgColor }}
              aria-label={`Average color: ${avgColor}`}
            />
            <span className="text-xs font-mono text-muted-foreground">{survivalRate}% survive</span>
          </div>
        </div>

        {/* Compact Control Buttons */}
        <div className="grid grid-cols-3 gap-1.5 pt-2">
          <Button onClick={onTogglePause} variant="outline" size="sm" className="h-8 px-2">
            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </Button>
          <Button onClick={onNextGeneration} variant="outline" size="sm" className="h-8 px-2">
            <SkipForward className="h-3 w-3" />
          </Button>
          <Button onClick={onReset} variant="outline" size="sm" className="h-8 px-2">
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>

        {/* Compact Sliders */}
        <div className="space-y-2 pt-2">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="timer-duration" className="text-xs font-medium">Timer</label>
              <span className="text-xs font-bold text-primary">{timerDuration}s</span>
            </div>
            <input
              id="timer-duration"
              type="range"
              min={minTimerDuration}
              max={maxTimerDuration}
              step="1"
              value={timerDuration}
              onChange={(e) => onTimerDurationChange(Number(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="mutation-rate" className="text-xs font-medium">Mutation</label>
              <span className="text-xs font-bold text-primary">{mutationPercentage}%</span>
            </div>
            <input
              id="mutation-rate"
              type="range"
              min="5"
              max="30"
              step="1"
              value={mutationPercentage}
              onChange={(e) => onMutationRateChange(Number(e.target.value) / 100)}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
