import { useNavigate } from '@tanstack/react-router'

/**
 * Follows one of the prototype's own hrefs — `/trim?view=production` — through the router.
 *
 * The prototype writes `location.href` because its pages are separate documents and it has no other way.
 * Copying that into an SPA throws the whole app away and boots it again: every store re-seeds, so an
 * order scheduled a moment ago is gone, and the click costs a full load. The href stays the prototype's,
 * because it is what the seed and the knowledge base say; only the way it is followed changes.
 */
export const useGoto = () => {
  const navigate = useNavigate()

  return (href: string) => {
    const [to, query] = href.split('?')
    if (!to) return

    const search = Object.fromEntries(new URLSearchParams(query))
    void navigate(query ? { to, search } : { to })
  }
}
