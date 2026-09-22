import { MachinesPage } from '@/features/machines'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_auth/settings/machines')({
  staticData: { crumb: 'Machines' },
  component: MachinesPage
})
