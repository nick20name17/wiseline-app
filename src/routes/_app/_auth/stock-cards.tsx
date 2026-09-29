import { StockCardsPage } from '@/features/board'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_auth/stock-cards')({
  staticData: { crumb: 'Stock Cards' },
  component: StockCardsPage
})
