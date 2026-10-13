import { formatDate } from '@/lib/days'
import { OverflowActions } from '@/components/overflow-actions'
import { SelectionBar } from '@/components/selection-bar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ArrowRight, Database } from 'lucide-react'
import { useBoard, useViewOnly } from '../lib/board-context'

type ScheduledToolbarProps = {
  total: number
  /** The production day being shown, or `null` on «All Scheduled Orders». */
  day: string | null
  selectedCount: number
  /** Which kind of order the batch has become, once one is ticked. */
  selectionKind: 'stock' | 'customer' | null
  canRelease: boolean
  isReleasing: boolean
  onAllocatedStock: () => void
  onRelease: () => void
}

export const ScheduledToolbar = ({
  total,
  day,
  selectedCount,
  selectionKind,
  canRelease,
  isReleasing,
  onAllocatedStock,
  onRelease
}: ScheduledToolbarProps) => {
  // Release To Production is a making department's; Allocated Stock is Trim's shelf alone.
  const { makes, stockCards } = useBoard()
  const viewOnly = useViewOnly()
  return (
    <div className='flex flex-wrap items-center gap-2.5'>
      <span className='text-sm text-muted-foreground'>
        {selectedCount ? (
          <>
            <b className='font-semibold text-foreground'>{selectedCount}</b>{' '}
            {selectionKind === 'stock' ? 'stock' : 'customer'} order
            {selectedCount === 1 ? '' : 's'} selected for release
          </>
        ) : (
          <>
            <b className='font-semibold text-foreground'>{total}</b> {day ? '' : 'scheduled '}order
            {total === 1 ? '' : 's'}
            {day ? ` on ${formatDate(day)}` : ''}
          </>
        )}
      </span>

      {makes && !viewOnly ? (
        <div className='ml-auto flex flex-wrap items-center justify-end gap-2 max-md:w-full max-md:flex-nowrap'>
          {stockCards ? (
            <OverflowActions
              actions={[{ label: 'Allocated Stock', icon: Database, onClick: onAllocatedStock }]}
            />
          ) : null}
          <SelectionBar
            active={selectedCount > 0}
            note={
              // A release is all stock orders or all customer orders, never a mix.
              selectedCount && !canRelease
                ? 'All selected orders must be Reviewed to release'
                : selectionKind
                  ? `${selectionKind === 'stock' ? 'Customer' : 'Stock'} orders locked (type exclusion)`
                  : null
            }
          >
            <Button disabled={!canRelease || isReleasing} onClick={onRelease}>
              {isReleasing ? (
                <Spinner data-icon='inline-start' />
              ) : (
                <ArrowRight data-icon='inline-start' />
              )}
              Release to production{selectedCount ? ` (${selectedCount})` : ''}
            </Button>
          </SelectionBar>
        </div>
      ) : null}
    </div>
  )
}
