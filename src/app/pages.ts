import { isManagerRole, meQuery } from '@/features/auth'
import { boardRoleQuery } from '@/features/board'
import { shippingPages, shippingRoleQuery } from '@/features/shipping'
import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'

/** The pages the sidebar links to, in the order a user's own page is looked for among them. */
export const PAGES = [
  '/trim',
  '/rollforming',
  '/accessories',
  '/shipping',
  '/loading',
  '/driver',
  '/settings'
] as const

export type Page = (typeof PAGES)[number]

export type PageAccess = Record<Page, boolean>

const BOARDS = [
  ['trim', '/trim'],
  ['rollforming', '/rollforming'],
  ['accessories', '/accessories']
] as const

/**
 * Which pages a user may open. A board whose role did not load counts as open: the board says what
 * went wrong, where a hidden link would say nothing.
 */
export const pagesQuery = (me: { id: number; role: string }) =>
  queryOptions({
    queryKey: ['departments', 'pages', me.id, me.role] as const,
    queryFn: async ({ client }): Promise<PageAccess> => {
      const [boards, shipping] = await Promise.all([
        Promise.all(
          BOARDS.map(async ([code, page]) => {
            const role = await client
              .fetchQuery(boardRoleQuery(me, code))
              .catch(() => 'unknown' as const)
            return [page, role !== null] as const
          })
        ),
        client
          .fetchQuery({ ...shippingRoleQuery(me), retry: false })
          .then(role => shippingPages(me.role, role))
          .catch(() => ({ shipping: false, loading: false, driver: false }))
      ])
      return {
        ...(Object.fromEntries(boards) as Record<(typeof BOARDS)[number][1], boolean>),
        '/shipping': shipping.shipping,
        '/loading': shipping.loading,
        '/driver': shipping.driver,
        '/settings': isManagerRole(me.role)
      }
    }
  })

/**
 * The page a user starts on: the first they may open. Settings is never one — it is not anyone's
 * work. Someone who may open nothing lands on Trim, whose board tells them whom to ask.
 */
export const homeOf = (pages: PageAccess) =>
  PAGES.find(page => page !== '/settings' && pages[page]) ?? '/trim'

const pagesOf = async (client: QueryClient) => {
  const me = await client.ensureQueryData(meQuery)
  return client.ensureQueryData(pagesQuery(me))
}

export const homePage = async (client: QueryClient) => homeOf(await pagesOf(client))

/** A hand-typed URL to a page the sidebar does not offer goes to the user's own page instead. */
export const guardPage = async (client: QueryClient, page: Page) => {
  const pages = await pagesOf(client)
  const home = homeOf(pages)
  if (!pages[page] && page !== home) throw redirect({ to: home, replace: true })
}
