import { TabCount } from '@/components/tab-count'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { History } from 'lucide-react'
import type { ReactNode } from 'react'
import { useActiveInView } from '@/hooks/use-active-in-view'
import { useIsMobile } from '@/hooks/use-mobile'
import { VIEW_LABELS } from '../lib/views'
import type { BoardView } from '../lib/boards'

type DeptBarProps = {
  /** The tabs this department and role have. */
  views: readonly BoardView[]
  view: BoardView
  /** Only the tabs whose list this page has already loaded carry a number. */
  counts: Partial<Record<BoardView, number>>
  onNavigate: (view: BoardView) => void
  /** What the open tab offers beside the strip. */
  actions?: ReactNode
}

/**
 * The department's tab strip. The department is already named in the breadcrumb above it, so the bar
 * carries no title of its own.
 */
export const DeptBar = ({ views, view, counts, onNavigate, actions }: DeptBarProps) => {
  // Completed is reached from the button beside the strip, not from the strip itself — the board
  // keeps it out of the working tabs because it is history rather than work.
  const strip = views.filter(tab => tab !== 'completed')

  const scroller = useActiveInView<HTMLDivElement>(view)
  // A phone gives the strip the row: the buttons beside it keep only their icons.
  const mobile = useIsMobile()

  return (
    // The rule runs the full width, and the active tab's underline sits on it.
    <div className='flex items-end gap-3 border-b border-border'>
      <Tabs
        className='min-w-0 flex-1'
        value={view}
        onValueChange={next => onNavigate(next as BoardView)}
      >
        {/* The scroll sits on a wrapper rather than on the list, so the first and last tab keep
          their focus ring where the strip has to scroll. */}
        <div ref={scroller} className='scrollport overflow-x-auto max-md:scrollbar-none'>
          <TabsList variant='line' className='h-9'>
            {/* A tab a role has no business with is not there at all, rather than there and dead. */}
            {strip.map(tab => (
              <TabsTrigger
                key={tab}
                value={tab}
                // The Slit Line keeps lit the tab it was opened from, and Tabs report no change for
                // the lit one: without this, clicking it would not leave the Slit Line.
                onClick={tab === view ? () => onNavigate(tab) : undefined}
              >
                {VIEW_LABELS[tab]}
                {tab in counts ? <TabCount count={counts[tab]} active={tab === view} /> : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {actions}

      {/* Hidden, not disabled: a role with no Completed tab has no business being sent to one. */}
      {views.includes('completed') ? (
        <Button
          variant='outline'
          size={mobile ? 'icon' : 'default'}
          aria-label={mobile ? 'Completed orders' : undefined}
          className='mb-1.5'
          data-active={view === 'completed' ? true : undefined}
          onClick={() => onNavigate('completed')}
        >
          <History data-icon={mobile ? undefined : 'inline-start'} />
          {/* A tablet leaves the tabs beside it too little room for the whole name. */}
          {mobile ? null : (
            <>
              <span className='xl:hidden'>Completed</span>
              <span className='max-xl:hidden'>Completed orders · past 90 days</span>
            </>
          )}
        </Button>
      ) : null}
    </div>
  )
}
