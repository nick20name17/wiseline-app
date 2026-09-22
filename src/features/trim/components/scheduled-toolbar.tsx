import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ArrowRight, Database } from 'lucide-react'

type ScheduledToolbarProps = {
  total: number
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
          <b className='font-semibold text-foreground'>{total}</b> order
          {total === 1 ? '' : 's'}
        </>
      )}
    </span>

    <div className='ml-auto flex flex-wrap items-center gap-2'>
      {/* A release is all stock orders or all customer orders, never a mix. */}
      {selectionKind ? (
        <span className='text-xs text-muted-foreground'>
          {selectionKind === 'stock' ? 'Customer' : 'Stock'} orders locked
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
            ? 'Every selected order has to be Reviewed to release'
            : 'Release the selected orders to production'
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
  </div>
)
