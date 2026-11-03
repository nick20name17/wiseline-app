import { useColumnOrder, type ColumnTable } from '@/components/table/column-order'
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
import type { Warehouse } from '../api'
import { WarehouseActions } from './warehouse-actions'

// Description takes the leftover width, since it is the one field that runs long. A street address
// runs to about 40 characters.
const COLUMNS: ColumnTable = {
  table: 'warehouses',
  columns: [
    { key: 'name', label: 'Name', width: 'w-40', align: 'start', card: 'title' },
    { key: 'address', label: 'Address', width: 'w-88', align: 'start' },
    { key: 'description', label: 'Description', align: 'start' },
    { key: 'default', label: 'Default', width: 'w-24' }
  ]
}

type WarehousesTableProps = {
  warehouses: Warehouse[]
  isPending: boolean
}

export const WarehousesTable = ({ warehouses, isPending }: WarehousesTableProps) => {
  const columns = useColumnOrder(COLUMNS)

  return (
    <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
      {/* `table-fixed` plus the widths below size the columns from the layout instead of from the
          widest cell, so they hold still between the skeleton, the data and every search. */}
      <Table data-cards className='min-w-4xl table-fixed'>
        <colgroup>
          {columns.cols}
          <col className='w-24' />
        </colgroup>
        <TableHeader>
          <TableRow>
            {columns.headers}
            <TableHead>
              {/* The column is obvious from its buttons; the label is for screen readers. */}
              <span className='sr-only'>Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending ? (
            <TableSkeletonRows actions />
          ) : (
            warehouses.map(warehouse => (
              <TableRow key={warehouse.id}>
                {columns.cells({
                  name: <TableCell>{warehouse.name ?? '—'}</TableCell>,
                  address: <TableCell>{warehouse.address ?? '—'}</TableCell>,
                  description: (
                    <TableCell>
                      <span className='text-muted-foreground'>{warehouse.description ?? '—'}</span>
                    </TableCell>
                  ),
                  default: (
                    <TableCell>
                      {warehouse.is_default ? (
                        <Badge variant='soft'>Default</Badge>
                      ) : (
                        <span className='text-muted-foreground'>—</span>
                      )}
                    </TableCell>
                  )
                })}
                <TableCell card='trail'>
                  <WarehouseActions warehouse={warehouse} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
