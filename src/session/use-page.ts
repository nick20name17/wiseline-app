import { useEffect } from 'react'

/**
 * Marks the mount point as the page being shown, which is what confines that page's stylesheet to it.
 *
 * It goes on `#root` rather than on the page's own outermost element because the prototype's rules are
 * scoped as `[data-page="x"] .foo` — a descendant selector needs an ancestor, and the page's own
 * element is one of the things being selected. `#root` is also the port's `<body>`: it holds exactly
 * what the prototype's body held, which is what makes the two comparable at all.
 */
export const usePage = (page: string, embedded = false) => {
  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return

    root.dataset.page = page
    // #198: a department page hosting this one inline wants the cards, not a second app around them
    root.classList.toggle('is-embed', embedded)

    return () => {
      delete root.dataset.page
      root.classList.remove('is-embed')
    }
  }, [page, embedded])
}
