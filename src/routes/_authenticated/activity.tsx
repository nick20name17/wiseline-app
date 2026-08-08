import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/activity')({
  component: () => <div data-page='activity' />
})
