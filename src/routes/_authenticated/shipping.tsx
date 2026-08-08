import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/shipping')({
  component: () => <div data-page='shipping' />
})
