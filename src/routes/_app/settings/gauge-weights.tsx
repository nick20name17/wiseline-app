import { GaugeWeightsPage } from '@/features/gauge-weights'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/settings/gauge-weights')({
  staticData: { crumb: 'Gauge Weights' },
  component: GaugeWeightsPage
})
