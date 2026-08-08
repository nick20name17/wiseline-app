import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/warehouse')({
  component: () => <div data-page='warehouse' />
})
