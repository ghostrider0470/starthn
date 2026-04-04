import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Brain, Eye, Play, RotateCcw, Target, Trophy, Zap } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import {
  calculateAvgColor,
  calculateDiversity,
  calculateFitness,
} from './evolution-metrics'
import type { EvolutionSnapshot } from './evolution-metrics'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

const CreatureScene = lazy(() =>
  import('./CreatureScene').then((module) => ({
    default: module.CreatureScene,
  })),
)

const EvolutionAnalytics = lazy(() =>
  import('./EvolutionAnalytics').then((module) => ({
    default: module.EvolutionAnalytics,
  })),
)

interface FigureData {
  id: string
  r: number
  g: number
  b: number
  size: number
  shape: 'bug' | 'fish' | 'bird' | 'rabbit' | 'squirrel' | 'cat' | 'dog' | 'turtle' | 'snail'
  opacity: number
  alive: boolean
}

interface RGB {
  r: number
  g: number
  b: number
}

const POPULATION_SIZE = 35
const BASE_TIMER = 15
const MUTATION_RATE = 0.15

const SHAPES: Array<FigureData['shape']> = [
  'bug', 'fish', 'bird', 'rabbit', 'squirrel', 'cat', 'dog', 'turtle', 'snail'
]

const BACKGROUNDS = [
  { name: 'Forest', r: [100, 150], g: [150, 200], b: [80, 130] },
  { name: 'Ocean', r: [50, 100], g: [150, 200], b: [200, 255] },
  { name: 'Desert', r: [200, 240], g: [180, 220], b: [120, 160] },
  { name: 'Sunset', r: [220, 255], g: [120, 180], b: [80, 130] },
  { name: 'Arctic', r: [200, 240], g: [220, 255], b: [230, 255] },
  { name: 'Cave', r: [60, 100], g: [60, 100], b: [80, 120] },
]

const ENCOURAGEMENTS = ['Nice!', 'Sharp eyes!', 'Got it!', 'Quick!', 'Found one!']

const generateBackground = (): RGB => {
  const theme = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)]
  return {
    r: theme.r[0] + Math.floor(Math.random() * (theme.r[1] - theme.r[0])),
    g: theme.g[0] + Math.floor(Math.random() * (theme.g[1] - theme.g[0])),
    b: theme.b[0] + Math.floor(Math.random() * (theme.b[1] - theme.b[0])),
  }
}

const clamp = (v: number, min = 0, max = 255) => Math.max(min, Math.min(max, Math.floor(v)))

const camouflageColor = (bg: RGB, variance = 60): RGB => ({
  r: clamp(bg.r + Math.floor(Math.random() * variance * 2) - variance),
  g: clamp(bg.g + Math.floor(Math.random() * variance * 2) - variance),
  b: clamp(bg.b + Math.floor(Math.random() * variance * 2) - variance),
})

const createPopulation = (bg: RGB): Array<FigureData> => {
  const population: Array<FigureData> = []

  // First 2 creatures have decent camouflage (moderate variance) - good genes to evolve from
  for (let i = 0; i < 2; i++) {
    population.push({
      id: `gen0-${i}`,
      ...camouflageColor(bg, 40), // Moderate variance = decent but not perfect
      size: 0.8 + Math.random() * 0.4,
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      opacity: 0.7 + Math.random() * 0.3,
      alive: true,
    })
  }

  // Rest have high variance - clearly visible, easy to spot
  for (let i = 2; i < POPULATION_SIZE; i++) {
    population.push({
      id: `gen0-${i}`,
      ...camouflageColor(bg, 120), // High variance = poor camouflage, easy to see
      size: 0.8 + Math.random() * 0.4,
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      opacity: 0.7 + Math.random() * 0.3,
      alive: true,
    })
  }

  return population
}

// Dominant gene crossover - better camouflage genes are more likely to be expressed
const crossover = (p1: FigureData, p2: FigureData, bg: RGB): Partial<FigureData> => {
  // Calculate fitness for each parent (lower distance = better camouflage)
  const dist1 = Math.sqrt(
    Math.pow(p1.r - bg.r, 2) + Math.pow(p1.g - bg.g, 2) + Math.pow(p1.b - bg.b, 2)
  )
  const dist2 = Math.sqrt(
    Math.pow(p2.r - bg.r, 2) + Math.pow(p2.g - bg.g, 2) + Math.pow(p2.b - bg.b, 2)
  )

  // Better camouflage parent has higher weight (inverse of distance)
  const weight1 = 1 / (dist1 + 1)
  const weight2 = 1 / (dist2 + 1)
  const totalWeight = weight1 + weight2
  const p1Dominance = weight1 / totalWeight // 0.5 = equal, higher = p1 more dominant

  // Weighted average favoring better camouflage genes
  return {
    r: Math.floor(p1.r * p1Dominance + p2.r * (1 - p1Dominance)),
    g: Math.floor(p1.g * p1Dominance + p2.g * (1 - p1Dominance)),
    b: Math.floor(p1.b * p1Dominance + p2.b * (1 - p1Dominance)),
    size: p1.size * p1Dominance + p2.size * (1 - p1Dominance),
    opacity: p1.opacity * p1Dominance + p2.opacity * (1 - p1Dominance),
    shape: Math.random() < p1Dominance ? p1.shape : p2.shape,
  }
}

const mutate = (f: Partial<FigureData>): Partial<FigureData> => {
  const result = { ...f }
  if (Math.random() < MUTATION_RATE) result.r = clamp((result.r || 0) + Math.floor(Math.random() * 30) - 15)
  if (Math.random() < MUTATION_RATE) result.g = clamp((result.g || 0) + Math.floor(Math.random() * 30) - 15)
  if (Math.random() < MUTATION_RATE) result.b = clamp((result.b || 0) + Math.floor(Math.random() * 30) - 15)
  if (Math.random() < MUTATION_RATE) result.size = clamp((result.size || 1) + (Math.random() * 0.3 - 0.15), 0.6, 1.3)
  if (Math.random() < MUTATION_RATE) result.opacity = clamp((result.opacity || 0.8) + (Math.random() * 0.2 - 0.1), 0.3, 1)
  if (Math.random() < MUTATION_RATE * 0.5) result.shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
  return result
}

const FITNESS_THRESHOLD = 90 // Lose if creatures reach this fitness level
const MIN_LEVEL_FOR_WIN_LOSE = 3 // Must reach this level before win/lose conditions apply

function SceneFallback() {
  return (
    <div className="h-[420px] md:h-[520px] rounded-2xl border border-border/60 bg-muted/30 animate-pulse" />
  )
}

function AnalyticsFallback() {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
      <div className="space-y-3 animate-pulse">
        <div className="h-4 w-36 rounded bg-muted" />
        <div className="h-2 w-full rounded bg-muted" />
        <div className="h-2 w-4/5 rounded bg-muted" />
        <div className="h-28 w-full rounded bg-muted" />
      </div>
    </div>
  )
}

export function CamouflageEvolution() {
  const currentLocale = getLocaleFromPath(window.location.pathname)
  const [gameState, setGameState] = useState<'start' | 'playing' | 'win' | 'lose'>('start')
  const [backgroundColor, setBackgroundColor] = useState<RGB>(generateBackground())
  const [figures, setFigures] = useState<Array<FigureData>>(() => createPopulation(backgroundColor))
  const [level, setLevel] = useState(1)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('creature-hunt-highscore') || '0')
    }
    return 0
  })
  const [timeLeft, setTimeLeft] = useState(BASE_TIMER)
  const [combo, setCombo] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [evolutionHistory, setEvolutionHistory] = useState<Array<EvolutionSnapshot>>([])
  const lastClickTime = useRef(0)

  const survivors = figures.filter(f => f.alive)
  const timerDuration = Math.max(8, BASE_TIMER - Math.floor(level / 3)) // Gets harder, min 8s

  // Calculate current analytics
  const aliveFigures = figures.filter(f => f.alive)
  const avgColor = calculateAvgColor(aliveFigures)
  const currentFitness = calculateFitness(avgColor, backgroundColor)
  const currentDiversity = calculateDiversity(aliveFigures)

  const endGame = useCallback((result: 'win' | 'lose') => {
    if (score > highScore) {
      setHighScore(score)
      localStorage.setItem('creature-hunt-highscore', score.toString())
    }
    setGameState(result)
  }, [score, highScore])

  const advanceLevel = useCallback(() => {
    const alive = figures.filter(f => f.alive)

    // Record evolution snapshot before advancing
    const snapshotAvgColor = calculateAvgColor(alive)
    const avgSize = alive.length > 0 ? alive.reduce((sum, f) => sum + f.size, 0) / alive.length : 1
    const avgOpacity = alive.length > 0 ? alive.reduce((sum, f) => sum + f.opacity, 0) / alive.length : 0.8
    const snapshot: EvolutionSnapshot = {
      level,
      avgFitness: calculateFitness(snapshotAvgColor, backgroundColor),
      avgColor: snapshotAvgColor,
      backgroundColor: { ...backgroundColor },
      diversity: calculateDiversity(alive),
      survivorCount: alive.length,
      totalPopulation: POPULATION_SIZE,
      avgSize,
      avgOpacity,
    }
    setEvolutionHistory(prev => [...prev, snapshot])

    // Only check win/lose after minimum level reached
    if (level >= MIN_LEVEL_FOR_WIN_LOSE) {
      // WIN: All creatures eliminated in this round!
      if (alive.length === 0) {
        endGame('win')
        return
      }

      // LOSE: Creatures became too well camouflaged
      const fitness = calculateFitness(snapshotAvgColor, backgroundColor)
      if (fitness >= FITNESS_THRESHOLD) {
        endGame('lose')
        return
      }
    }

    // Keep same background throughout the game to show evolution convergence
    const newBg = backgroundColor

    // Breed new generation
    let nextGen: Array<FigureData> = []

    // If all eliminated before min level, create fresh population
    if (alive.length === 0) {
      nextGen = createPopulation(newBg)
    } else {
      // Survivors carry over
      alive.forEach((s, i) => nextGen.push({ ...s, id: `gen${level}-s${i}`, alive: true }))

      // Breed offspring from random survivors (dominant genes favor better camouflage)
      while (nextGen.length < POPULATION_SIZE) {
        const p1 = alive[Math.floor(Math.random() * alive.length)]
        const p2 = alive[Math.floor(Math.random() * alive.length)]
        const child = mutate(crossover(p1, p2, newBg))
        nextGen.push({
          id: `gen${level}-${nextGen.length}`,
          r: child.r || 128,
          g: child.g || 128,
          b: child.b || 128,
          size: child.size || 1,
          shape: child.shape || 'bug',
          opacity: child.opacity || 0.8,
          alive: true,
        })
      }
    }

    setBackgroundColor(newBg)
    setFigures(nextGen)
    setLevel(l => l + 1)
    setTimeLeft(timerDuration)
    setCombo(0)
  }, [figures, level, backgroundColor, timerDuration, endGame])

  // Timer - use ref to avoid stale closure
  const advanceLevelRef = useRef(advanceLevel)
  advanceLevelRef.current = advanceLevel

  useEffect(() => {
    if (gameState !== 'playing') return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          advanceLevelRef.current()
          return timerDuration
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState, timerDuration])

  const handleEliminate = useCallback((id: string) => {
    const now = Date.now()
    const timeSinceLastClick = now - lastClickTime.current
    lastClickTime.current = now

    // Calculate points
    let points = 10
    const newCombo = timeSinceLastClick < 1500 ? combo + 1 : 1
    setCombo(newCombo)

    // Combo bonus
    if (newCombo > 1) {
      points += newCombo * 2
    }

    // Speed bonus (first 3 seconds)
    if (timeLeft > timerDuration - 3) {
      points += 5
    }

    setScore(s => s + points)
    setFigures(prev => prev.map(f => (f.id === id ? { ...f, alive: false } : f)))

    // Show feedback
    const msg = newCombo > 2 ? `${newCombo}x Combo!` : ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 800)
  }, [combo, timeLeft, timerDuration])

  const startGame = () => {
    const bg = generateBackground()
    setBackgroundColor(bg)
    setFigures(createPopulation(bg))
    setLevel(1)
    setScore(0)
    setTimeLeft(BASE_TIMER)
    setCombo(0)
    setEvolutionHistory([])
    setGameState('playing')
  }

  // Start Screen
  if (gameState === 'start') {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Card className="text-center">
          <CardContent className="pt-8 pb-6 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">How to Play</h2>
              <p className="text-muted-foreground">Hunt creatures before they evolve to hide!</p>
            </div>

            <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-3">
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium">Find</p>
                <p className="text-xs text-muted-foreground">Spot creatures hiding in the background</p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium">Click</p>
                <p className="text-xs text-muted-foreground">Eliminate them before time runs out</p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium">Evolve</p>
                <p className="text-xs text-muted-foreground">Survivors breed and get harder to find</p>
              </div>
            </div>

            <Button onClick={startGame} size="lg" className="w-full text-lg h-14">
              <Play className="mr-2 h-5 w-5" />
              Start Game
            </Button>

            {highScore > 0 && (
              <p className="text-sm text-muted-foreground">
                High Score: <span className="font-bold text-primary">{highScore}</span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="py-4 flex items-center gap-3">
            <Brain className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Powered by Genetic Algorithms</strong> —
              The same AI technique used in optimization, game AI, and machine learning.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Win/Lose Screen
  if (gameState === 'win' || gameState === 'lose') {
    const isWin = gameState === 'win'
    const isNewHighScore = score >= highScore && score > 0
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6 md:flex-row">
        {/* Left Column - Game Results */}
        <div className="space-y-4 flex-1">
          <Card className="text-center">
            <CardContent className="pt-8 pb-6 space-y-6">
              {isNewHighScore && (
                <Badge variant="warning">
                  <Trophy className="h-3 w-3 mr-1" />
                  New High Score!
                </Badge>
              )}

              <div>
                <h2 className={`text-3xl font-bold mb-2 ${isWin ? 'text-primary' : 'text-destructive'}`}>
                  {isWin ? 'You Win!' : 'Game Over'}
                </h2>
                <p className="text-muted-foreground">
                  {isWin
                    ? 'You eliminated all creatures before they could adapt!'
                    : 'The creatures evolved beyond detection!'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Final Score</p>
                  <p className="text-3xl font-bold text-primary">{score}</p>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Levels Reached</p>
                  <p className="text-3xl font-bold">{level}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={startGame} size="lg" className="flex-1">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Play Again
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-6 space-y-4">
              <div className="flex items-start gap-3">
                <Brain className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">You Just Experienced Genetic Algorithms!</h3>
                  <p className="text-sm text-muted-foreground">
                    {isWin
                      ? 'You beat the algorithm! In real applications, genetic algorithms often find optimal solutions - but you proved humans can still outthink evolution.'
                      : 'The creatures evolved using the same AI techniques we use to solve real-world optimization problems — from route planning to machine learning model tuning.'}
                  </p>
                </div>
              </div>
              <Link to={withLocalePath('/services/ai-ml-business-intelligence', currentLocale)}>
                <Button variant="outline" className="w-full">
                  Learn About Our AI Solutions
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Expanded Analytics */}
        <div className="w-full md:w-[380px] shrink-0">
          <Suspense fallback={<AnalyticsFallback />}>
            <EvolutionAnalytics
              history={evolutionHistory}
              currentFitness={currentFitness}
              currentDiversity={currentDiversity}
              avgColor={avgColor}
              backgroundColor={backgroundColor}
              isGameOver
            />
          </Suspense>
        </div>
      </div>
    )
  }

  // Playing Screen
  return (
    <div className="flex flex-col gap-4 md:flex-row">
      {/* Game Area */}
      <div className="relative flex-1 min-w-0">
        <Suspense fallback={<SceneFallback />}>
          <CreatureScene
            figures={figures}
            onEliminate={handleEliminate}
            backgroundColor={backgroundColor}
          />
        </Suspense>

        {/* Stats Overlay */}
        <div className="pointer-events-none absolute left-3 right-3 top-3 flex items-start justify-between gap-2 sm:left-4 sm:right-4 sm:top-4">
          <div className="rounded-lg bg-background/90 px-3 py-2 shadow-lg backdrop-blur-sm sm:px-4">
            <div className="text-xs text-muted-foreground">Level</div>
            <div className="text-xl font-bold sm:text-2xl">{level}</div>
          </div>

          <div className="rounded-lg bg-background/90 px-3 py-2 text-center shadow-lg backdrop-blur-sm sm:px-4">
            <div className="text-xs text-muted-foreground">Score</div>
            <div className="text-xl font-bold text-primary sm:text-2xl">{score}</div>
            {combo > 1 && (
              <Badge variant="secondary" className="text-xs mt-1">{combo}x</Badge>
            )}
          </div>

          <div className="rounded-lg bg-background/90 px-3 py-2 shadow-lg backdrop-blur-sm sm:px-4">
            <div className="text-xs text-muted-foreground">Time</div>
            <div className={`text-xl font-bold sm:text-2xl ${timeLeft <= 3 ? 'text-destructive' : ''}`}>
              {timeLeft}s
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full font-bold text-lg animate-bounce">
              {feedback}
            </div>
          </div>
        )}

        {/* Survivors indicator */}
        <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-lg pointer-events-none">
          <span className="text-sm">
            <span className="font-bold">{survivors.length}</span>
            <span className="text-muted-foreground">/{POPULATION_SIZE} remaining</span>
          </span>
        </div>

        {/* Exit button */}
        <div className="absolute bottom-4 right-4 pointer-events-auto">
          <Button
            onClick={() => endGame('lose')}
            variant="secondary"
            size="sm"
            className="bg-background/90 backdrop-blur-sm"
          >
            Exit
          </Button>
        </div>
      </div>

      {/* Analytics Panel - Side by side on md+, below game on mobile */}
      <div className="w-full md:w-[300px] shrink-0">
        <Suspense fallback={<AnalyticsFallback />}>
          <EvolutionAnalytics
            history={evolutionHistory}
            currentFitness={currentFitness}
            currentDiversity={currentDiversity}
            avgColor={avgColor}
            backgroundColor={backgroundColor}
          />
        </Suspense>
      </div>
    </div>
  )
}
