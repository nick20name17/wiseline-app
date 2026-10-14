import { MachinesPage } from '@/features/machines'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/settings/machines')({
  staticData: { crumb: 'Machines' },
  component: MachinesPage
})
