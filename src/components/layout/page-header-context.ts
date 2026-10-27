import { createContext, use, useLayoutEffect, type ReactNode } from 'react'

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

// Two contexts: pages only publish, and one reading the value would re-render on every header it
// published itself.
export const PageHeaderContext = createContext<PageHeader>({})
export const SetPageHeaderContext = createContext<(header: PageHeader) => void>(() => {})

export const usePageHeaderValue = () => use(PageHeaderContext)

/**
 * Publish this page's header pieces. Keyed on `trail`, so pass a `search` node that owns its own
 * state — it is published once per trail change and is not re-read on every render.
 */
export const usePageHeader = (header: PageHeader) => {
  const setHeader = use(SetPageHeaderContext)
  const trail = header.trail?.join('/') ?? ''

  // Before paint, so the page's first frame already has its breadcrumb and search.
  useLayoutEffect(() => {
    setHeader(header)
    return () => setHeader({})
    // The search node is rebuilt every render; the trail is what actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trail, setHeader])
}
