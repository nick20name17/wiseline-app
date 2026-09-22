import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { History } from 'lucide-react'
import { cn } from 'cn'
import { canAccess, TRIM_VIEWS, VIEW_LABELS, type TrimView } from '../lib/views'

type DeptBarProps = {
  view: TrimView
  role: string
  /** Only the tabs whose list this page has already loaded carry a number. */
  counts: Partial<Record<TrimView, number>>
  onNavigate: (view: TrimView) => void
}

// Completed is reached from the button in the title row, not from the tab strip — the board keeps it
// out of the working tabs because it is history rather than work.
const TAB_STRIP = TRIM_VIEWS.filter(view => view !== 'completed')

/**
 * The department's own bar: its title, its code chip and its tab strip. The navigation rail and the
 * breadcrumb header above it are the app's and are shared with every other page.
 */
export const DeptBar = ({ view, role, counts, onNavigate }: DeptBarProps) => (
  <div className='flex flex-col gap-3'>
    <div className='flex items-center gap-3'>
      <h1 className='font-heading text-xl font-semibold tracking-tight'>Trim</h1>
      <span className='rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-xs tracking-wider text-muted-foreground uppercase'>
        dept · 01
      </span>
      {/* Hidden, not disabled: a role with no Completed tab has no business being sent to one. */}
      {canAccess('completed', role) ? (
        <Button
          variant='outline'

          className='ml-auto'
          data-active={view === 'completed' ? true : undefined}
          onClick={() => onNavigate('completed')}
        >
          <History data-icon='inline-start' />
          Completed orders · past 90 days
        </Button>
      ) : null}
    </div>

    {/* The rule runs the full width and the active tab's underline sits on it. */}
    <div className='border-b border-border'>
      <Tabs value={view} onValueChange={next => onNavigate(next as TrimView)}>
        {/* The scroll sits on a wrapper rather than on the list, so the first and last tab keep
            their focus ring where the strip has to scroll. */}
        <div className='scrollport overflow-x-auto'>
          <TabsList variant='line' className='h-9'>
            {TAB_STRIP.map(tab => (
              <TabsTrigger
                key={tab}
                value={tab}
                // A tab a role has no business with is not there at all, rather than there and dead.
                className={canAccess(tab, role) ? undefined : 'hidden'}
              >
                {VIEW_LABELS[tab]}
                {counts[tab] === undefined ? null : (
                  // The count takes the tab's own colour, so the active one reads as one thing.
                  <span
                    className={cn(
                      'ml-0.5 rounded-full px-1.5 font-mono text-xs',
                      tab === view ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {counts[tab]}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    </div>
  </div>
)
