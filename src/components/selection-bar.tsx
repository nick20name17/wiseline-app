import { cn } from 'cn'
import type { ReactNode } from 'react'

type SelectionBarProps = {
  /** Something is ticked, so the actions on it are what the page is for right now. */
  active: boolean
  /**
   * What holds the actions back, said in words: a disabled button's `title` never shows on a touch
   * screen, and on a phone the toolbar that would say it has scrolled away.
   */
  note?: ReactNode
  children: ReactNode
}

/**
 * A toolbar's actions on the ticked rows. In place on a tablet or a desk; on a phone they share out
 * the row they are in, and once a row is ticked they ride along the bottom of the screen within a
 * thumb's reach, as a phone's own select mode has them — the toolbar has long scrolled away by the
 * time the rows are picked.
 */
export const SelectionBar = ({ active, note, children }: SelectionBarProps) => (
  <div
    data-selection-bar={active ? '' : undefined}
    className={cn(
      'flex flex-wrap items-center gap-2 max-md:flex-1',
      active &&
        'max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-20 max-md:border-t max-md:bg-background max-md:px-safe-3 max-md:pt-3 max-md:pb-safe-3 max-md:shadow-lg'
    )}
  >
    {note ? (
      <span className='text-xs text-muted-foreground max-md:w-full max-md:text-center'>{note}</span>
    ) : null}
    <div className='flex flex-wrap items-center gap-2 max-md:w-full max-md:flex-nowrap max-md:*:flex-1'>
      {children}
    </div>
  </div>
)
