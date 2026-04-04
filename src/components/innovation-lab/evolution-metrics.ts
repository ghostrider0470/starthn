export interface RGB {
  r: number
  g: number
  b: number
}

export interface EvolutionSnapshot {
  level: number
  avgFitness: number
  avgColor: RGB
  backgroundColor: RGB
  diversity: number
  survivorCount: number
  totalPopulation: number
  avgSize: number
  avgOpacity: number
}

export const calculateColorDistance = (c1: RGB, c2: RGB): number => {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2),
  )
}

export const calculateFitness = (avgColor: RGB, backgroundColor: RGB): number => {
  // Use a practical max distance (~100) instead of theoretical max (~441)
  // This gives more meaningful fitness percentages for gameplay.
  const practicalMaxDistance = 100
  const distance = calculateColorDistance(avgColor, backgroundColor)
  return Math.max(0, Math.min(100, 100 - (distance / practicalMaxDistance) * 100))
}

export const calculateDiversity = (
  figures: Array<{ r: number; g: number; b: number }>,
): number => {
  if (figures.length < 2) {
    return 100
  }

  // Calculate variance in RGB values.
  const avgR = figures.reduce((sum, figure) => sum + figure.r, 0) / figures.length
  const avgG = figures.reduce((sum, figure) => sum + figure.g, 0) / figures.length
  const avgB = figures.reduce((sum, figure) => sum + figure.b, 0) / figures.length

  const variance =
    figures.reduce((sum, figure) => {
      return (
        sum +
        Math.pow(figure.r - avgR, 2) +
        Math.pow(figure.g - avgG, 2) +
        Math.pow(figure.b - avgB, 2)
      )
    }, 0) / figures.length

  // Normalize to 0-100 (max variance is when half are 0,0,0 and half are 255,255,255).
  const maxVariance = 3 * Math.pow(127.5, 2)
  return Math.min(100, (variance / maxVariance) * 100)
}

export const calculateAvgColor = (
  figures: Array<{ r: number; g: number; b: number }>,
): RGB => {
  if (figures.length === 0) {
    return { r: 128, g: 128, b: 128 }
  }

  return {
    r: figures.reduce((sum, figure) => sum + figure.r, 0) / figures.length,
    g: figures.reduce((sum, figure) => sum + figure.g, 0) / figures.length,
    b: figures.reduce((sum, figure) => sum + figure.b, 0) / figures.length,
  }
}
