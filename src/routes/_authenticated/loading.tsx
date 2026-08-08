import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/loading')({
  component: () => <div data-page='loading' />
})
