import { createFileRoute } from '@tanstack/react-router'
import { Cpu, Radar, Router } from 'lucide-react'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'

export const Route = createFileRoute('/{-$locale}/services/iot-edge-computing')(
  {
    head: () => ({
      meta: [
        { title: 'IoT & Edge Computing — Horizon Tech' },
        {
          name: 'description',
          content:
            'IoT and edge computing solutions by Horizon Tech. Connected devices, real-time data processing, and intelligent edge systems.',
        },
        {
          property: 'og:title',
          content: 'IoT & Edge Computing — Horizon Tech',
        },
        {
          property: 'og:description',
          content:
            'IoT and edge computing solutions by Horizon Tech. Connected devices, real-time data processing, and intelligent edge systems.',
        },
      ],
    }),
    component: IoTEdgeComputing,
  },
)

const icons = [
  Router,
  Cpu,
  Radar,
]

function IoTEdgeComputing() {
  return <ServicePageTemplate serviceKey="iot" icons={icons} />
}
