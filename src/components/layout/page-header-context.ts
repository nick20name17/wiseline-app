import { createContext, use, useEffect, type ReactNode } from 'react'

/**
 * What a page adds to the app header: the rest of its breadcrumb, and its own search box.
 *
 * The header belongs to the `_app` layout and the search belongs to the page below it — a department
 * board searches its orders, and only it knows what «search» means there. So the page hands the two
 * up rather than the header reaching down into a feature it must not know about.
 */
export type PageHeader = {
  /** Breadcrumb segments after the route's own, e.g. the active tab of a department board. */
  trail?: string[]
  search?: ReactNode
}

export const PageHeaderContext = createContext<{
  header: PageHeader
  setHeader: (header: PageHeader) => void
}>({ header: {}, setHeader: () => {} })

export const usePageHeaderValue = () => use(PageHeaderContext).header

/**
 * Publish this page's header pieces. Keyed on `trail`, so pass a `search` node that owns its own
 * state — it is published once per trail change and is not re-read on every render.
 */
export const usePageHeader = (header: PageHeader) => {
  const { setHeader } = use(PageHeaderContext)
  const trail = header.trail?.join('/') ?? ''

  useEffect(() => {
    setHeader(header)
    return () => setHeader({})
    // The search node is rebuilt every render; the trail is what actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trail, setHeader])
}
