import { createFileRoute } from '@tanstack/react-router'
import { Cpu, Radar, Router } from 'lucide-react'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'

export const Route = createFileRoute('/{-$locale}/services/iot-edge-computing')(
  {
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
