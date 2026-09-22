import { Button } from '@/components/ui/button'
import { CalendarDays, FastForward, Plus, QrCode } from 'lucide-react'

type UnscheduledToolbarProps = {
  total: number
  selectedCount: number
  readOnly: boolean
  onStockCards: () => void
  onCreateStockOrder: () => void
  onBypass: () => void
  onSchedule: () => void
}

export const UnscheduledToolbar = ({
  total,
  selectedCount,
  readOnly,
  onStockCards,
  onCreateStockOrder,
  onBypass,
  onSchedule
}: UnscheduledToolbarProps) => (
  <div className='flex flex-wrap items-center gap-2.5'>
    <span className='text-sm text-muted-foreground'>
      {selectedCount ? (
        <>
          <b className='font-semibold text-foreground'>{selectedCount}</b> selected
        </>
      ) : (
        <>
          <b className='font-semibold text-foreground'>{total}</b> unscheduled order
          {total === 1 ? '' : 's'}
        </>
      )}
    </span>

    <div className='ml-auto flex flex-wrap items-center gap-2'>
      <Button variant='outline' size='sm' onClick={onStockCards}>
        <QrCode data-icon='inline-start' />
        Stock Cards
      </Button>
      <Button variant='outline' size='sm' onClick={onCreateStockOrder}>
        <Plus data-icon='inline-start' />
        Create stock order
      </Button>
      <Button
        variant='outline'
        size='sm'
        disabled={readOnly || !selectedCount}
        title='Skip the Slinet and the machines — straight to Wrapping, with today as the production date'
        onClick={onBypass}
      >
        <FastForward data-icon='inline-start' />
        Bypass Production{selectedCount ? ` (${selectedCount})` : ''}
      </Button>
      <Button size='sm' disabled={readOnly || !selectedCount} onClick={onSchedule}>
        <CalendarDays data-icon='inline-start' />
        Schedule{selectedCount ? ` (${selectedCount})` : ''}
      </Button>
    </div>
  </div>
)
