import { OverflowActions } from '@/components/overflow-actions'
import { SelectionBar } from '@/components/selection-bar'
import { Button } from '@/components/ui/button'
import { useBoard, useViewOnly } from '../lib/board-context'
import { CalendarDays, FastForward, Plus, QrCode } from 'lucide-react'

type UnscheduledToolbarProps = {
  /** The orders on screen, which is what the line counts until something is ticked. */
  total: number
  selectedCount: number
  /** Every write is scoped to the department; until its id is known there is nothing to write to. */
  ready: boolean
  onStockCards: () => void
  onCreateStockOrder: () => void
  onBypass: () => void
  onSchedule: () => void
}

export const UnscheduledToolbar = ({
  total,
  selectedCount,
  ready,
  onStockCards,
  onCreateStockOrder,
  onBypass,
  onSchedule
}: UnscheduledToolbarProps) => {
  // Stock orders, stock cards and Bypass Production belong to a department that makes what it packs.
  const { stockCards } = useBoard()
  const viewOnly = useViewOnly()
  return (
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

      {viewOnly ? null : (
        <div className='ml-auto flex flex-wrap items-center justify-end gap-2 max-md:w-full max-md:flex-nowrap'>
          {stockCards ? (
            <OverflowActions
              actions={[
                { label: 'Stock Cards', icon: QrCode, onClick: onStockCards },
                { label: 'Create stock order', icon: Plus, onClick: onCreateStockOrder }
              ]}
            />
          ) : null}
          <SelectionBar active={selectedCount > 0}>
            {stockCards ? (
              <Button
                variant='outline'
                disabled={!ready || !selectedCount}
                title='Skip Slinet + Machines — straight to Wrapping (Status: Bypassed), Production Date today'
                onClick={onBypass}
              >
                <FastForward data-icon='inline-start' className='size-3.5' />
                {/* A phone shares the row out three ways; the short word fits a third. */}
                <span className='md:hidden'>Bypass</span>
                <span className='max-md:hidden'>Bypass Production</span>
                {selectedCount ? ` (${selectedCount})` : ''}
              </Button>
            ) : null}
            <Button disabled={!ready || !selectedCount} onClick={onSchedule}>
              <CalendarDays data-icon='inline-start' className='size-3.5' />
              Schedule{selectedCount ? ` (${selectedCount})` : ''}
            </Button>
          </SelectionBar>
        </div>
      )}
    </div>
  )
}
