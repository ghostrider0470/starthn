import { useMemo } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import { Activity, Dna, Palette, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { echarts, getEChartThemeColors } from '@/lib/echarts'
import { useIsDarkMode } from '@/hooks/useIsDarkMode'
import type { RGB, EvolutionSnapshot } from './evolution-metrics'

export type { RGB, EvolutionSnapshot } from './evolution-metrics'

interface EvolutionAnalyticsProps {
  history: Array<EvolutionSnapshot>
  currentFitness: number
  currentDiversity: number
  avgColor: RGB
  backgroundColor: RGB
  isGameOver?: boolean
}

export function EvolutionAnalytics({
  history,
  currentFitness,
  currentDiversity,
  avgColor,
  backgroundColor,
  isGameOver = false,
}: EvolutionAnalyticsProps) {
  const isDarkMode = useIsDarkMode()
  const theme = useMemo(() => getEChartThemeColors(), [isDarkMode])
  const avgColorStr = `rgb(${Math.round(avgColor.r)}, ${Math.round(avgColor.g)}, ${Math.round(avgColor.b)})`
  const bgColorStr = `rgb(${Math.round(backgroundColor.r)}, ${Math.round(backgroundColor.g)}, ${Math.round(backgroundColor.b)})`

  // Calculate dynamic ranges based on data
  const rgbValues = history.flatMap(h => [h.avgColor.r, h.avgColor.g, h.avgColor.b])
  const sizeValues = history.map(h => h.avgSize || 1)
  const opacityValues = history.map(h => h.avgOpacity || 0.8)
  const sizeOpacityValues = [...sizeValues, ...opacityValues]

  const rgbMin = rgbValues.length > 0 ? Math.max(0, Math.floor(Math.min(...rgbValues)) - 10) : 0
  const rgbMax = rgbValues.length > 0 ? Math.min(255, Math.ceil(Math.max(...rgbValues)) + 10) : 255
  const soMin = sizeOpacityValues.length > 0 ? Math.max(0, Math.floor((Math.min(...sizeOpacityValues) - 0.1) * 10) / 10) : 0
  const soMax = sizeOpacityValues.length > 0 ? Math.ceil((Math.max(...sizeOpacityValues) + 0.1) * 10) / 10 : 1.5

  // Chart options for trait evolution over time (RGB + Size + Opacity)
  const chartOption = {
    grid: {
      left: '10%',
      right: '12%',
      top: '18%',
      bottom: '15%',
    },
    legend: {
      data: ['R', 'G', 'B', 'Size', 'Opacity'],
      top: 0,
      itemWidth: 10,
      itemHeight: 6,
      textStyle: { fontSize: 8, color: theme.mutedForeground },
      itemGap: 6,
    },
    xAxis: {
      type: 'category',
      data: history.map(h => h.level),
      axisLabel: { fontSize: 8, color: theme.mutedForeground },
      axisLine: { lineStyle: { color: theme.border } },
    },
    yAxis: [
      {
        type: 'value',
        name: 'RGB',
        nameTextStyle: { fontSize: 8, color: theme.mutedForeground },
        min: rgbMin,
        max: rgbMax,
        axisLabel: { fontSize: 8, color: theme.mutedForeground },
        axisLine: { lineStyle: { color: theme.border } },
        splitLine: { lineStyle: { type: 'dashed', color: theme.splitLine } },
      },
      {
        type: 'value',
        name: 'Size/Op',
        nameTextStyle: { fontSize: 8, color: theme.mutedForeground },
        min: soMin,
        max: soMax,
        axisLabel: { fontSize: 8, formatter: (v: number) => v.toFixed(1), color: theme.mutedForeground },
        axisLine: { lineStyle: { color: theme.border } },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'R',
        data: history.map(h => Math.round(h.avgColor.r)),
        type: 'line',
        smooth: false,
        lineStyle: { width: 2, color: theme.chart[0] },
        itemStyle: { color: theme.chart[0] },
        symbolSize: 3,
        yAxisIndex: 0,
      },
      {
        name: 'G',
        data: history.map(h => Math.round(h.avgColor.g)),
        type: 'line',
        smooth: false,
        lineStyle: { width: 2, color: theme.chart[1] },
        itemStyle: { color: theme.chart[1] },
        symbolSize: 3,
        yAxisIndex: 0,
      },
      {
        name: 'B',
        data: history.map(h => Math.round(h.avgColor.b)),
        type: 'line',
        smooth: false,
        lineStyle: { width: 2, color: theme.chart[2] },
        itemStyle: { color: theme.chart[2] },
        symbolSize: 3,
        yAxisIndex: 0,
      },
      {
        name: 'Size',
        data: history.map(h => h.avgSize?.toFixed(2) || 1),
        type: 'line',
        smooth: false,
        lineStyle: { width: 2, color: theme.chart[3] },
        itemStyle: { color: theme.chart[3] },
        symbolSize: 3,
        yAxisIndex: 1,
      },
      {
        name: 'Opacity',
        data: history.map(h => h.avgOpacity?.toFixed(2) || 0.8),
        type: 'line',
        smooth: false,
        lineStyle: { width: 2, color: theme.chart[4] },
        itemStyle: { color: theme.chart[4] },
        symbolSize: 3,
        yAxisIndex: 1,
      },
    ],
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => {
        const level = history[params[0]?.dataIndex]?.level || 0
        let html = `<strong>Level ${level}</strong><br/>`
        params.forEach(p => {
          html += `${p.marker} ${p.seriesName}: ${p.value}<br/>`
        })
        return html
      },
      backgroundColor: theme.card,
      borderColor: theme.border,
      textStyle: { color: theme.foreground },
    },
  }

  // Compact mode during gameplay
  if (!isGameOver) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Evolution Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {/* Fitness Gauge */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Camouflage Fitness
              </span>
              <span className="text-sm font-bold text-foreground">{Math.round(currentFitness)}%</span>
            </div>
            <Progress value={currentFitness} className="h-2" />
            <p className="text-[10px] text-muted-foreground">
              How well creatures blend with the environment
            </p>
          </div>

          {/* Color Comparison */}
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Palette className="h-3 w-3" />
              Color Match
            </span>
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-0.5">
                <div
                  className="h-6 rounded border"
                  style={{ backgroundColor: avgColorStr }}
                />
                <p className="text-[9px] text-center text-muted-foreground">Creatures</p>
              </div>
              <span className="text-xs text-muted-foreground">vs</span>
              <div className="flex-1 space-y-0.5">
                <div
                  className="h-6 rounded border"
                  style={{ backgroundColor: bgColorStr }}
                />
                <p className="text-[9px] text-center text-muted-foreground">Target</p>
              </div>
            </div>
          </div>

          {/* Trait Evolution Chart */}
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Trait Evolution
            </span>
            {history.length > 1 ? (
              <ReactEChartsCore
                echarts={echarts}
                option={chartOption}
                style={{ height: '140px', width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            ) : (
              <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground bg-muted/30 rounded">
                Chart appears after Level 2
              </div>
            )}
          </div>

          {/* Genetic Diversity */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Dna className="h-3 w-3" />
                Genetic Diversity
              </span>
              <span className="text-sm font-bold">{Math.round(currentDiversity)}%</span>
            </div>
            <Progress value={currentDiversity} className="h-2" />
            <p className="text-[10px] text-muted-foreground">
              Variety in population traits (decreases as they converge)
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Expanded mode for game over
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Evolution Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Final Fitness</p>
            <p className="text-2xl font-bold text-primary">{Math.round(currentFitness)}%</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Generations</p>
            <p className="text-2xl font-bold">{history.length}</p>
          </div>
        </div>

        {/* Color Evolution */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Color Adaptation</h4>
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <div
                className="h-8 rounded border"
                style={{ backgroundColor: avgColorStr }}
              />
              <p className="text-xs text-center text-muted-foreground">Final Avg</p>
            </div>
            <span className="text-muted-foreground">=</span>
            <div className="flex-1 space-y-1">
              <div
                className="h-8 rounded border"
                style={{ backgroundColor: bgColorStr }}
              />
              <p className="text-xs text-center text-muted-foreground">Target</p>
            </div>
          </div>
        </div>

        {/* Full RGB Chart */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Trait Evolution Over Time</h4>
          {history.length > 1 ? (
            <ReactEChartsCore
              echarts={echarts}
              option={{
                ...chartOption,
                grid: { left: '12%', right: '5%', top: '15%', bottom: '12%' },
                legend: { ...chartOption.legend, top: 0, textStyle: { fontSize: 11 } },
              }}
              style={{ height: '180px', width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground bg-muted/30 rounded">
              Not enough data to show chart
            </div>
          )}
        </div>

        {/* Educational Insight */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold mb-2">What You Observed</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {currentFitness > 80
              ? 'The creatures evolved excellent camouflage! Natural selection favored those who blended best with the environment.'
              : currentFitness > 50
                ? 'The population adapted significantly. Given more generations, they would become nearly invisible.'
                : 'Evolution was just getting started. Each generation inherited traits from the best survivors.'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
