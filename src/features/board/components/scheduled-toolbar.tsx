import { formatDate } from '@/lib/days'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ArrowRight, Database } from 'lucide-react'

type ScheduledToolbarProps = {
  /** Allocated Stock and Release To Production are a making department's; Accessories has neither. */
  makes: boolean
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
  makes,
  total,
  day,
  selectedCount,
  selectionKind,
  canRelease,
  isReleasing,
  onAllocatedStock,
  onRelease
}: ScheduledToolbarProps) => (
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

    {makes ? (
      <div className='ml-auto flex flex-wrap items-center gap-2'>
        {/* A release is all stock orders or all customer orders, never a mix. */}
        {selectionKind ? (
          <span className='text-xs text-muted-foreground'>
            {selectionKind === 'stock' ? 'Customer' : 'Stock'} orders locked (type exclusion)
          </span>
        ) : null}

        <Button variant='outline' onClick={onAllocatedStock}>
          <Database data-icon='inline-start' />
          Allocated Stock
        </Button>
        <Button
          disabled={!canRelease || isReleasing}
          title={
            selectedCount && !canRelease
              ? 'All selected orders must be Reviewed to release'
              : 'Release selected orders to production'
          }
          onClick={onRelease}
        >
          {isReleasing ? (
            <Spinner data-icon='inline-start' />
          ) : (
            <ArrowRight data-icon='inline-start' />
          )}
          Release to production{selectedCount ? ` (${selectedCount})` : ''}
        </Button>
      </div>
    ) : null}
  </div>
)
