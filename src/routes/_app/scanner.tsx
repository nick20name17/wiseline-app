import { ScannerPage } from '@/features/board'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/scanner')({
  staticData: { crumb: 'Scanner' },
  component: ScannerPage
})
