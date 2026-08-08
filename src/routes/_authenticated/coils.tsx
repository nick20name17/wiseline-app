import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/coils')({
  component: () => <div data-page='coils' />
})
