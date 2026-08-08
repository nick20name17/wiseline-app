import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/stock-cards')({
  component: () => <div data-page='stockcards' />
})
