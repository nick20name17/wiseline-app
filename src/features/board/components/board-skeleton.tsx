import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const Pills = ({ count }: { count: number }) =>
  Array.from({ length: count }, (_, index) => <Skeleton key={index} className='h-5 w-24' />)

/** The machine row while its machines load: `MachineStrip`'s height, so the table below holds still. */
export const MachineStripSkeleton = () => (
  <div className='flex h-8 items-center gap-3 px-1.5'>
    <Pills count={4} />
  </div>
)

/**
 * The board's frame while the viewer's role in it is settled — `DeptBar`, the machine row on a board
 * that has one, and a table — so the page that replaces it lands where this one stood.
 */
export const BoardSkeleton = ({ machineTabs }: { machineTabs: boolean }) => (
  <section className='flex min-w-0 flex-1 flex-col gap-4'>
    <div className='flex items-end gap-3 border-b border-border'>
      <div className='flex h-9 flex-1 items-center gap-3 px-1.5'>
        <Pills count={5} />
      </div>
      {/* Every role on every board has Completed, so its button is always beside the strip. */}
      <Skeleton className='mb-1.5 h-8 w-60' />
    </div>

    {machineTabs ? <MachineStripSkeleton /> : null}

    <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
      <Table className='table-fixed'>
        <TableHeader>
          <TableRow>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableSkeletonRows columns={6} />
        </TableBody>
      </Table>
    </div>
  </section>
)
