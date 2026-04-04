import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'

echarts.use([
  LineChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  SVGRenderer,
])

export interface EChartThemeColors {
  card: string
  foreground: string
  mutedForeground: string
  border: string
  splitLine: string
  chart: [string, string, string, string, string]
}

const DEFAULT_ECHART_THEME: EChartThemeColors = {
  card: 'rgb(255, 255, 255)',
  foreground: 'rgb(15, 23, 42)',
  mutedForeground: 'rgb(100, 116, 139)',
  border: 'rgb(203, 213, 225)',
  splitLine: 'rgba(100, 116, 139, 0.25)',
  chart: [
    'rgb(239, 68, 68)',
    'rgb(34, 197, 94)',
    'rgb(59, 130, 246)',
    'rgb(245, 158, 11)',
    'rgb(139, 92, 246)',
  ],
}

function resolveCssColor(value: string, fallback: string): string {
  if (typeof document === 'undefined') {
    return fallback
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return fallback
  }

  ctx.fillStyle = '#000000'
  ctx.fillStyle = value

  return ctx.fillStyle || fallback
}

function readThemeColor(cssVarName: string, fallback: string): string {
  if (typeof document === 'undefined') {
    return fallback
  }

  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVarName)
    .trim()

  if (!raw) {
    return fallback
  }

  return resolveCssColor(raw, fallback)
}

function withAlpha(color: string, alpha: number, fallback: string): string {
  const hexMatch = color.match(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i)
  if (hexMatch) {
    const hex = hexMatch[1]
    const normalized = hex.length === 3
      ? hex.split('').map((c) => c + c).join('')
      : hex
    const r = parseInt(normalized.slice(0, 2), 16)
    const g = parseInt(normalized.slice(2, 4), 16)
    const b = parseInt(normalized.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const rgbMatch = color.match(
    /rgba?\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)/i,
  )
  if (!rgbMatch) {
    return fallback
  }

  return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`
}

export function getEChartThemeColors(): EChartThemeColors {
  const card = readThemeColor('--card', DEFAULT_ECHART_THEME.card)
  const foreground = readThemeColor('--foreground', DEFAULT_ECHART_THEME.foreground)
  const mutedForeground = readThemeColor(
    '--muted-foreground',
    DEFAULT_ECHART_THEME.mutedForeground,
  )
  const border = readThemeColor('--border', DEFAULT_ECHART_THEME.border)

  return {
    card,
    foreground,
    mutedForeground,
    border,
    splitLine: withAlpha(
      mutedForeground,
      0.28,
      DEFAULT_ECHART_THEME.splitLine,
    ),
    chart: [
      readThemeColor('--chart-1', DEFAULT_ECHART_THEME.chart[0]),
      readThemeColor('--chart-2', DEFAULT_ECHART_THEME.chart[1]),
      readThemeColor('--chart-3', DEFAULT_ECHART_THEME.chart[2]),
      readThemeColor('--chart-4', DEFAULT_ECHART_THEME.chart[3]),
      readThemeColor('--chart-5', DEFAULT_ECHART_THEME.chart[4]),
    ],
  }
}

export { echarts }
