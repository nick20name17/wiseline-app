import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { Disc3 } from 'lucide-react'
import { currentCoilQuery } from '../api'

const Field = ({ label, value }: { label: string; value: string | null }) => (
  <div className='flex min-w-0 flex-col'>
    <span className='text-xs tracking-wider text-muted-foreground uppercase'>{label}</span>
    <span className='truncate font-mono text-sm'>{value ?? '—'}</span>
  </div>
)

/**
 * «Current Coil In The Rollformer» p2 (1007,312): the coil ticked in the machine on the Queue
 * p2 (902,356), its Supplier, Coil Number and Gauge & Color p2 (925,359), so the Worker picks the
 * orders that run off it p2 (1040,322).
 */
export const CurrentCoil = ({ machineId }: { machineId: number | undefined }) => {
  const { data: coil, isPending, isError, refetch } = useQuery(currentCoilQuery(machineId))

  return (
    <section
      aria-label='Current coil in the rollformer'
      className='flex flex-wrap items-center gap-x-8 gap-y-2 rounded-lg border border-border bg-card px-4 py-3 shadow-xs'
    >
      <span className='flex items-center gap-2 text-sm font-medium'>
        <Disc3 className='size-4 text-muted-foreground' />
        Current coil in the rollformer
      </span>
      {isError && coil === undefined ? (
        // Not «None»: an empty machine is something the Worker acts on.
        <span className='flex items-center gap-2 text-sm text-destructive'>
          The coil in the machine did not load.
          <Button variant='outline' size='sm' onClick={() => void refetch()}>
            Retry
          </Button>
        </span>
      ) : isPending && machineId !== undefined ? (
        <Skeleton className='h-8 w-64' />
      ) : coil ? (
        <>
          <Field label='Supplier' value={coil.supplier} />
          <Field label='Coil Number' value={coil.coil_number} />
          <Field
            label='Gauge / Color'
            value={[coil.gauge && `${coil.gauge} Ga`, coil.color].filter(Boolean).join(' ') || null}
          />
          <Field label='Material' value={coil.material_id} />
        </>
      ) : (
        <span className='text-sm text-muted-foreground'>
          None — tick the coil in the machine on the Queue.
        </span>
      )}
    </section>
  )
}
