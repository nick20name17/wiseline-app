import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/scanner')({
  component: () => <div data-page='scanner' />
})
