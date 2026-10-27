import { homePage } from '@/app/pages'
import { createFileRoute, redirect } from '@tanstack/react-router'

// There is no Dashboard yet (client-questions §8); `/` stays a route because the logo, the
// not-found page and sign-in point at it, and it sends each user to their own page.
export const Route = createFileRoute('/_app/')({
  beforeLoad: async ({ context }) => {
    throw redirect({ to: await homePage(context.queryClient), replace: true })
  }
})
