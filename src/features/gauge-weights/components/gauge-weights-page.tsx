import { RowActions } from '@/components/row-actions'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { Weight } from 'lucide-react'
import { gaugeRowsQuery, useClearGaugeWeight, type GaugeRow } from '../api'
import { GaugeWeightDialog } from './gauge-weight-dialog'

const GaugeActions = ({ row }: { row: GaugeRow }) => {
  const clear = useClearGaugeWeight()
  const id = row.id
  return (
    <RowActions
      name={`${row.gauge} ga`}
      edit={dialog => <GaugeWeightDialog row={row} {...dialog} />}
      remove={
        id === null
          ? undefined
          : {
              title: `Clear the ${row.gauge} ga weight?`,
              description: "Its coils go back to the product's weight in EBMS.",
              isPending: clear.isPending,
              onConfirm: () => clear.mutateAsync(id)
            }
      }
    />
  )
}

/**
 * The weight of a square foot of coil by gauge (call of 2026-10-26). A coil's weight is worked out
 * from it; a gauge with none set keeps EBMS's product weight.
 */
export const GaugeWeightsPage = () => {
  const { data: rows, isPending } = useQuery(gaugeRowsQuery)

  return (
    <section className='flex flex-1 flex-col gap-4'>
      <p className='text-sm text-muted-foreground'>
        Pounds per square foot, paint included. A gauge with none set uses the product weight from
        EBMS.
      </p>
      {!isPending && !rows?.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Weight />
            </EmptyMedia>
            <EmptyTitle>No gauges</EmptyTitle>
            <EmptyDescription>No active coil in EBMS has a gauge yet.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
          <Table data-cards className='min-w-2xl table-fixed'>
            <colgroup>
              <col className='w-28' />
              <col className='w-28' />
              <col className='w-40' />
              <col />
              <col className='w-24' />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Gauge</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>lb / sq ft</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>
                  <span className='sr-only'>Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableSkeletonRows columns={4} />
              ) : (
                rows.map(row => (
                  <TableRow key={row.gauge}>
                    <TableCell card='title'>
                      <span className='font-mono'>{row.gauge} ga</span>
                    </TableCell>
                    <TableCell label='Products'>
                      <span className='font-mono'>{row.products}</span>
                    </TableCell>
                    <TableCell label='lb / sq ft'>
                      {row.weight === null ? (
                        <span className='text-muted-foreground'>EBMS weight</span>
                      ) : (
                        <span className='font-mono'>{row.weight}</span>
                      )}
                    </TableCell>
                    <TableCell label='Description'>
                      <span className='truncate'>{row.description ?? '—'}</span>
                    </TableCell>
                    <TableCell card='trail'>
                      <GaugeActions row={row} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
