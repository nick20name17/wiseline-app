import { homePath, isManagerRole, meQuery } from '@/features/auth'
import { StockCardsPage } from '@/features/board'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/stock-cards')({
  staticData: { crumb: 'Stock Cards' },
  // The cards are made by Managers; a bench scans them from its own board.
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    if (!isManagerRole(me.role)) throw redirect({ to: homePath(me), replace: true })
  },
  component: StockCardsPage
})
