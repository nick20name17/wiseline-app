import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/driver')({
  component: () => <div data-page='driver' />
})
