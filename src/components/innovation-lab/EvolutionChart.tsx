import { useMemo } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import { echarts, getEChartThemeColors } from '@/lib/echarts'
import { useIsDarkMode } from '@/hooks/useIsDarkMode'

interface EvolutionData {
  generation: number
  r: number
  g: number
  b: number
  size: number
  opacity: number
}

interface EvolutionChartProps {
  evolutionHistory: EvolutionData[]
}

export function EvolutionChart({ evolutionHistory }: EvolutionChartProps) {
  const isDarkMode = useIsDarkMode()
  const theme = useMemo(() => getEChartThemeColors(), [isDarkMode])

  // Calculate dynamic ranges for better scaling
  const rgbValues = evolutionHistory.flatMap(d => [d.r, d.g, d.b])
  const sizeValues = evolutionHistory.map(d => d.size)
  const opacityValues = evolutionHistory.map(d => d.opacity)

  const rgbMin = Math.max(0, Math.floor(Math.min(...rgbValues)) - 20)
  const rgbMax = Math.min(255, Math.ceil(Math.max(...rgbValues)) + 20)

  const sizeMin = Math.max(0, Math.floor((Math.min(...sizeValues) - 0.1) * 10) / 10)
  const sizeMax = Math.min(1.5, Math.ceil((Math.max(...sizeValues) + 0.1) * 10) / 10)

  const option = {
    title: {
      text: 'Evolution Over Time',
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 600,
        color: theme.foreground,
      },
      top: 10,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      formatter: (params: any) => {
        const gen = params[0].axisValue
        let tooltip = `<strong style="font-size: 14px;">Generation ${gen}</strong><br/>`
        params.forEach((param: any) => {
          const value = param.seriesName === 'Size' || param.seriesName === 'Opacity'
            ? param.value.toFixed(2)
            : Math.round(param.value)
          tooltip += `<span style="font-size: 13px;">${param.marker} ${param.seriesName}: <strong>${value}</strong></span><br/>`
        })
        return tooltip
      },
      backgroundColor: theme.card,
      borderColor: theme.border,
      textStyle: {
        color: theme.foreground,
      },
    },
    legend: {
      data: ['Red', 'Green', 'Blue', 'Size', 'Opacity'],
      top: 45,
      icon: 'circle',
      itemWidth: 16,
      itemHeight: 12,
      itemGap: 20,
      textStyle: {
        fontSize: 14,
        color: theme.mutedForeground,
      },
    },
    grid: {
      left: '8%',
      right: '8%',
      bottom: '15%',
      top: '25%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: evolutionHistory.map((d) => d.generation),
      name: 'Generation',
      nameLocation: 'middle',
      nameGap: 35,
      nameTextStyle: {
        fontSize: 14,
        fontWeight: 600,
        color: theme.mutedForeground,
      },
      axisLabel: {
        fontSize: 13,
        color: theme.mutedForeground,
      },
      axisLine: {
        lineStyle: {
          width: 2,
          color: theme.border,
        },
      },
    },
    yAxis: [
      {
        type: 'value',
        name: 'RGB Color Value',
        nameLocation: 'middle',
        nameGap: 60,
        nameTextStyle: {
          fontSize: 14,
          fontWeight: 600,
          color: theme.mutedForeground,
        },
        min: rgbMin,
        max: rgbMax,
        axisLabel: {
          fontSize: 13,
          color: theme.mutedForeground,
        },
        axisLine: {
          lineStyle: {
            color: theme.border,
          },
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            color: theme.splitLine,
          },
        },
      },
      {
        type: 'value',
        name: 'Size / Opacity',
        nameLocation: 'middle',
        nameGap: 60,
        nameTextStyle: {
          fontSize: 14,
          fontWeight: 600,
          color: theme.mutedForeground,
        },
        min: sizeMin,
        max: sizeMax,
        axisLabel: {
          fontSize: 13,
          formatter: (value: number) => value.toFixed(1),
          color: theme.mutedForeground,
        },
        axisLine: {
          lineStyle: {
            color: theme.border,
          },
        },
        splitLine: {
          show: false,
        },
      },
    ],
    series: [
      {
        name: 'Red',
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        data: evolutionHistory.map((d) => Math.round(d.r)),
        lineStyle: {
          width: 4,
          color: theme.chart[0],
        },
        itemStyle: {
          color: theme.chart[0],
        },
        symbolSize: 8,
      },
      {
        name: 'Green',
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        data: evolutionHistory.map((d) => Math.round(d.g)),
        lineStyle: {
          width: 4,
          color: theme.chart[1],
        },
        itemStyle: {
          color: theme.chart[1],
        },
        symbolSize: 8,
      },
      {
        name: 'Blue',
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        data: evolutionHistory.map((d) => Math.round(d.b)),
        lineStyle: {
          width: 4,
          color: theme.chart[2],
        },
        itemStyle: {
          color: theme.chart[2],
        },
        symbolSize: 8,
      },
      {
        name: 'Size',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: evolutionHistory.map((d) => d.size),
        lineStyle: {
          width: 4,
          color: theme.chart[3],
        },
        itemStyle: {
          color: theme.chart[3],
        },
        symbolSize: 8,
      },
      {
        name: 'Opacity',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: evolutionHistory.map((d) => d.opacity),
        lineStyle: {
          width: 4,
          color: theme.chart[4],
        },
        itemStyle: {
          color: theme.chart[4],
        },
        symbolSize: 8,
      },
    ],
  }

  if (evolutionHistory.length === 0) {
    return (
      <div className="w-full py-6">
        <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground bg-muted/20 rounded-lg">
          Evolution data will appear as generations progress...
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        style={{ height: '500px', width: '100%' }}
        opts={{ renderer: 'svg' }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  )
}
