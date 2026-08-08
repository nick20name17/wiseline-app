import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/accessories')({
  component: () => <div data-page='accessories' />
})
