import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from 'cn'
import { History } from 'lucide-react'
import { VIEW_LABELS, type BoardView } from '../lib/views'

type DeptBarProps = {
  /** The tabs this department and role have. */
  views: readonly BoardView[]
  view: BoardView
  /** Only the tabs whose list this page has already loaded carry a number. */
  counts: Partial<Record<BoardView, number>>
  onNavigate: (view: BoardView) => void
}

/**
 * The department's tab strip. The department is already named in the breadcrumb above it, so the bar
 * carries no title of its own.
 */
export const DeptBar = ({ views, view, counts, onNavigate }: DeptBarProps) => {
  // Completed is reached from the button beside the strip, not from the strip itself — the board
  // keeps it out of the working tabs because it is history rather than work.
  const strip = views.filter(tab => tab !== 'completed')

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
        <div className='scrollport overflow-x-auto'>
          <TabsList variant='line' className='h-9'>
            {/* A tab a role has no business with is not there at all, rather than there and dead. */}
            {strip.map(tab => (
              <TabsTrigger key={tab} value={tab}>
                {VIEW_LABELS[tab]}
                {tab in counts ? (
                  // The count takes the tab's own colour, so the active one reads as one thing. It
                  // holds its place while the list loads, rather than shunting the tabs beside it.
                  <span
                    className={cn(
                      'ml-0.5 rounded-full px-1.5 font-mono text-xs',
                      tab === view
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground',
                      counts[tab] === undefined && 'opacity-0'
                    )}
                  >
                    {counts[tab] ?? 0}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {/* Hidden, not disabled: a role with no Completed tab has no business being sent to one. */}
      {views.includes('completed') ? (
        <Button
          variant='outline'
          className='mb-1.5'
          data-active={view === 'completed' ? true : undefined}
          onClick={() => onNavigate('completed')}
        >
          <History data-icon='inline-start' />
          Completed orders · past 90 days
        </Button>
      ) : null}
    </div>
  )
}
