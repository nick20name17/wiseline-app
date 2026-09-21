import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import type { Truck } from '../api'
import { formatLength, formatVolume, formatWeight } from '../lib/format'
import { TruckActions } from './truck-actions'

const COLUMNS = [
  { key: 'name', label: 'Name', render: (truck: Truck) => truck.name },
  { key: 'max_height', label: 'Max Height', render: (t: Truck) => formatLength(t.max_height) },
  { key: 'max_length', label: 'Max Length', render: (t: Truck) => formatLength(t.max_length) },
  { key: 'max_weight', label: 'Max Weight', render: (t: Truck) => formatWeight(t.max_weight) },
  { key: 'max_volume', label: 'Max Volume', render: (t: Truck) => formatVolume(t.max_volume) },
  { key: 'max_width', label: 'Max Width', render: (t: Truck) => formatLength(t.max_width) }
] as const

const SKELETON_ROWS = 5

type TrucksTableProps = {
  trucks: Truck[]
  isPending: boolean
}

export const TrucksTable = ({ trucks, isPending }: TrucksTableProps) => (
  <div className='overflow-x-auto rounded-lg border border-border'>
    <Table>
      <TableHeader>
        <TableRow>
          {COLUMNS.map(column => (
            <TableHead key={column.key}>{column.label}</TableHead>
          ))}
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isPending
          ? Array.from({ length: SKELETON_ROWS }, (_, row) => (
              <TableRow key={row}>
                {COLUMNS.map(column => (
                  <TableCell key={column.key}>
                    <Skeleton className='h-4 w-24' />
                  </TableCell>
                ))}
                <TableCell>
                  <Skeleton className='size-7' />
                </TableCell>
              </TableRow>
            ))
          : trucks.map(truck => (
              <TableRow key={truck.id}>
                {COLUMNS.map(column => (
                  <TableCell key={column.key}>{column.render(truck)}</TableCell>
                ))}
                <TableCell>
                  <TruckActions truck={truck} />
                </TableCell>
              </TableRow>
            ))}
      </TableBody>
    </Table>
  </div>
)
