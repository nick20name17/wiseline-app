import { Button } from '@/components/ui/button'
import { CalendarDays, FastForward, Plus, QrCode } from 'lucide-react'

type UnscheduledToolbarProps = {
  selectedCount: number
  readOnly: boolean
  /** Every write is scoped to the department; until its id is known there is nothing to write to. */
  ready: boolean
  onStockCards: () => void
  onCreateStockOrder: () => void
  onBypass: () => void
  onSchedule: () => void
}

export const UnscheduledToolbar = ({
  selectedCount,
  readOnly,
  ready,
  onStockCards,
  onCreateStockOrder,
  onBypass,
  onSchedule
}: UnscheduledToolbarProps) => (
  <div className='flex flex-wrap items-center gap-2.5'>
    {/* How many orders the tab holds is already on the tab; this line says only what the count on
        the tab cannot — how many of them are ticked. */}
    {selectedCount ? (
      <span className='text-sm text-muted-foreground'>
        <b className='font-semibold text-foreground'>{selectedCount}</b> selected
      </span>
    ) : null}

    <div className='ml-auto flex flex-wrap items-center gap-2'>
      <Button variant='outline' onClick={onStockCards}>
        <QrCode data-icon='inline-start' />
        Stock Cards
      </Button>
      <Button variant='outline' onClick={onCreateStockOrder}>
        <Plus data-icon='inline-start' />
        Create stock order
      </Button>
      <Button
        variant='outline'

        disabled={readOnly || !ready || !selectedCount}
        title='Skip the Slinet and the machines — straight to Wrapping, with today as the production date'
        onClick={onBypass}
      >
        <FastForward data-icon='inline-start' />
        Bypass Production{selectedCount ? ` (${selectedCount})` : ''}
      </Button>
      <Button disabled={readOnly || !ready || !selectedCount} onClick={onSchedule}>
        <CalendarDays data-icon='inline-start' />
        Schedule{selectedCount ? ` (${selectedCount})` : ''}
      </Button>
    </div>
  </div>
)
