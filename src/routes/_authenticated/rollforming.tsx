import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/rollforming')({
  component: () => <div data-page='rollforming' />
})
