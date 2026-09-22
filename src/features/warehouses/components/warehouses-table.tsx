import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { defaultWarehouseId } from '@/lib/default-warehouse'
import type { Warehouse } from '../api'
import { WarehouseActions } from './warehouse-actions'

type WarehousesTableProps = {
  warehouses: Warehouse[]
  isPending: boolean
}

export const WarehousesTable = ({ warehouses, isPending }: WarehousesTableProps) => {
  const defaultId = defaultWarehouseId(warehouses)

  return (
    <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
      {/* `table-fixed` plus the widths below size the columns from the layout instead of from the
          widest cell, so they hold still between the skeleton, the data and every search. */}
      <Table className='min-w-4xl table-fixed'>
        {/* Description takes the leftover width, since it is the one field that runs long. */}
        <colgroup>
          <col className='w-56' />
          <col className='w-64' />
          <col />
          <col className='w-28' />
          <col className='w-24' />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Default</TableHead>
            <TableHead>
              {/* The column is obvious from its buttons; the label is for screen readers. */}
              <span className='sr-only'>Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending ? (
            <TableSkeletonRows columns={4} />
          ) : (
            warehouses.map(warehouse => (
              <TableRow key={warehouse.id}>
                <TableCell>{warehouse.name ?? '—'}</TableCell>
                <TableCell>{warehouse.address ?? '—'}</TableCell>
                <TableCell>
                  <span className='text-muted-foreground'>{warehouse.description ?? '—'}</span>
                </TableCell>
                <TableCell>
                  {warehouse.id === defaultId ? (
                    <Badge variant='soft'>Default</Badge>
                  ) : (
                    <span className='text-muted-foreground'>—</span>
                  )}
                </TableCell>
                <TableCell>
                  <WarehouseActions warehouse={warehouse} isDefault={warehouse.id === defaultId} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
