import { useEffect } from 'react'

/**
 * Dresses `#root` for a screen rewritten in Tailwind.
 *
 * `#root` is the port's `<body>`: the prototype styled the body (a centred flex column, the page
 * background, the base font), and the screen's own outermost element is a child of it, so there is
 * nowhere in the screen's own markup to put those rules without adding a wrapper the parity tree would
 * see. The classes live in the route file, where Tailwind scans them.
 */
export const useRootClass = (className: string) => {
  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return

    const classes = className.split(/\s+/).filter(Boolean)
    root.classList.add(...classes)

    return () => {
      root.classList.remove(...classes)
    }
  }, [className])
}
