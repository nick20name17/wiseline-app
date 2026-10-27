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
      <div className='flex h-9 min-w-0 flex-1 items-center gap-3 overflow-hidden px-1.5'>
        <Pills count={5} />
      </div>
      {/* Every role on every board has Completed, so its button is always beside the strip — an icon
          on a phone, the short name on a tablet. */}
      <Skeleton className='mb-1.5 size-10 shrink-0 md:h-8 md:w-28 xl:w-60' />
    </div>

    {machineTabs ? <MachineStripSkeleton /> : null}

    {/* Below lg the board's tables lay their rows out as separate cards, so the placeholder does too. */}
    <div className='flex flex-col gap-3 lg:hidden'>
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className='grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-lg border border-border bg-card px-4 py-3 shadow-xs sm:grid-cols-4'
        >
          <Skeleton className='col-span-full h-5 w-32' />
          <Skeleton className='col-span-full -mt-1 h-4 w-48' />
          {Array.from({ length: 4 }, (_, field) => (
            <Skeleton key={field} className='h-8 w-full' />
          ))}
        </div>
      ))}
    </div>

    <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs max-lg:hidden'>
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
