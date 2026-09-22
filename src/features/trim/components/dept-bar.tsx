import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { History } from 'lucide-react'
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
      <Button
        variant='outline'
        size='sm'
        className='ml-auto'
        data-active={view === 'completed' ? true : undefined}
        onClick={() => onNavigate('completed')}
      >
        <History data-icon='inline-start' />
        Completed orders · past 90 days
      </Button>
    </div>

    {/* The rule runs the full width and the active tab's underline sits on it. */}
    <div className='border-b border-border'>
      <Tabs value={view} onValueChange={next => onNavigate(next as TrimView)}>
        <TabsList variant='line' className='h-9 overflow-x-auto'>
          {TAB_STRIP.map(tab => (
            <TabsTrigger
              key={tab}
              value={tab}
              // A tab a role has no business with is not there at all, rather than there and dead.
              className={canAccess(tab, role) ? undefined : 'hidden'}
            >
              {VIEW_LABELS[tab]}
              {counts[tab] === undefined ? null : (
                <span className='ml-0.5 rounded-full bg-muted px-1.5 font-mono text-xs text-muted-foreground'>
                  {counts[tab]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  </div>
)
