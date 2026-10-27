import { cn } from 'cn'
import type { ReactNode } from 'react'

/**
 * A tab's top, from its toolbar down to its list, kept in view under the board's bar while the list
 * scrolls, so the day, the totals and the actions are in reach at the bottom of a long list. The board
 * says how tall its bar is in `--board-bar`. A phone has no height to spare for it.
 */
export const StickyTop = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div
    className={cn(
      'flex flex-col gap-3 bg-background md:sticky md:top-under-board md:z-5 md:-mx-6 md:px-6 md:pb-2',
      className
    )}
  >
    {children}
  </div>
)
