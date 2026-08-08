import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/ebms')({
  component: () => <div data-page='ebms' />
})
