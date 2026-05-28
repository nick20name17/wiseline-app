import { useQuery } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import {
  type AccessorKeyColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'

import { ViewDetailsDialog } from '../../dialogs/view-details.tsx'

import { cuttingGroupedTableColumns } from './columns.tsx'
import { getAllCategoriesQueryOptions } from '@/api/categories/query.ts'
import type { OriginItem } from '@/api/origin-items/schema.ts'
import type { Priority } from '@/api/priorities/schema'
import { ColumnHeader } from '@/components/common/data-table/column-header.tsx'
import { COLUMN_KEYS } from '@/components/common/data-table/constants.ts'
import { DataTable } from '@/components/common/data-table/index.tsx'
import type { DataTableProps } from '@/components/common/data-table/types.ts'
import { getDefaultCategory } from '@/components/common/filters/category.tsx'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth.tsx'
import { StatusCompleteToggle } from '@/routes/_production/-components/toggle/status-complete.tsx'
import { formatLength } from '@/utils/format.ts'
import { groupBy } from '@/utils/group.ts'

export const CuttingGroupedTable = ({ className, data, isLoading }: DataTableProps<OriginItem>) => {
  const groupedByPriority = groupBy(data, (item) => ({
    id: item?.priority?.id ?? null,
    name: item?.priority?.name ?? null,
    color: item?.priority?.color ?? null
  }))

  if (isLoading) {
    return <Skeleton className='size-full' />
  }

  if (data.length === 0)
    return <div className='h-full rounded-md border pt-14 text-center'> No results.</div>

  return (
    <ScrollArea className={cn('h-full min-h-0 rounded-md border', className)}>
      {groupedByPriority.map(({ key, data }) => (
        <CuttingGroupedTableGroup
          key={String(key.id)}
          priority={key as Priority | null}
          data={data}
          className='h-full min-h-0 [&_.expanded-row_td]:border-b-0 last-of-type:[&_tr:last-child_td]:border-b-0'
        />
      ))}

      <ScrollBar orientation='horizontal' />
    </ScrollArea>
  )
}

const CuttingGroupedTableGroup = ({
  data,
  className,
  priority
}: {
  data: OriginItem[]
  className?: string
  priority?: Priority | null
}) => {
  const groupedByGaugeColor = groupBy(data, (item) => ({
    color: item.color,
    gauge: item.gauge
    // prod_date: item?.production_date ?? ''
  }))

  return (
    <>
      <div className='bg-muted sticky top-0 z-2 border-b px-3 py-2.5'>
        <div className='flex items-center gap-2'>
          <div
            className='size-3.5 rounded-sm'
            style={{ backgroundColor: priority?.color }}
          />
          <span className='text-sm font-medium'>Priority: {priority?.name || '-'}</span>
        </div>
      </div>

      <CuttingGroupedTableGroupTable
        data={groupedByGaugeColor.map(({ key, data }) => ({
          color: key.color,
          gauge: key.gauge,
          // prod_date: key.prod_date,
          data
        }))}
        className={cn('rounded-none border-b', className)}
      />
    </>
  )
}

export interface GroupedByDateGaugeColor {
  color: string
  gauge: string | null
  // prod_date: string
  data: OriginItem[]
}

const CuttingGroupedTableGroupTable = ({
  data,
  className
}: {
  data: GroupedByDateGaugeColor[]
  className?: string
}) => {
  const table = useReactTable({
    data,
    columns: cuttingGroupedTableColumns,
    manualExpanding: true,
    sortDescFirst: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowCanExpand: (row) => row.original.data.length > 0
  })

  return (
    <DataTable
      className={className}
      isStickyHeader={false}
      table={table}
      renderSubComponent={(row) => {
        const groupedByLengthSize = groupBy(row.original.data, (item) => ({
          length: item.length ?? 0,
          width: item.width ?? 0,
          completed: item?.item?.status === 'cut'
        }))

        return (
          <GroupedByLengthSizeTable
            data={groupedByLengthSize.map(({ key, data }) => ({
              length: key.length as number,
              width: key.width as number,
              data
            }))}
          />
        )
      }}
    />
  )
}

interface GroupedByLengthSize {
  length: number
  width: number
  data: OriginItem[]
}

interface GroupedByLengthSizeTableProps {
  data: GroupedByLengthSize[]
}

const GroupedByLengthSizeTable = ({ data }: GroupedByLengthSizeTableProps) => {
  const { data: categories } = useQuery(getAllCategoriesQueryOptions())
  const { user } = useAuth()
  const defaultCategory = getDefaultCategory(user)

  const { category = defaultCategory } = useSearch({ from: '/_production/' })

  const flows = categories?.filter((c) => c.name === category).flatMap((c) => c.flows)

  const flowsColumns: AccessorKeyColumnDef<GroupedByLengthSize>[] = flows
    ? flows.map((flow) => ({
        accessorKey: flow.id.toString(),
        header: ({ column }) => (
          <ColumnHeader
            column={column}
            title={flow.name}
          />
        ),
        cell: ({ row }) => {
          const count = row.original.data.filter((i) => i.item?.flow?.id === flow.id).length
          return <div>{count}</div>
        },
        sortingFn: (rowA, rowB) => {
          const getCount = (row: typeof rowA | typeof rowB) => {
            return row.original.data.filter((i) => i.item?.flow?.id === flow.id).length
          }
          return getCount(rowA) - getCount(rowB)
        },
        size: 120
      }))
    : []

  const totalQtyColumns: AccessorKeyColumnDef<GroupedByLengthSize> = {
    accessorKey: 'totalQty',
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title={'Total'}
      />
    ),
    cell: ({ row }) => {
      const count = row.original.data.filter((i) => !!i.item?.flow?.id).length
      return <div>{count}</div>
    },
    sortingFn: (rowA, rowB) => {
      const getCount = (row: typeof rowA | typeof rowB) => {
        return row.original.data.filter((i) => !!i.item?.flow?.id).length
      }
      return getCount(rowA) - getCount(rowB)
    },
    size: 120
  }

  const table = useReactTable({
    data,
    columns: [
      ...groupedByLengthSizeColumns.slice(0, 2),
      ...flowsColumns,
      totalQtyColumns,
      ...groupedByLengthSizeColumns.slice(2),
      {
        accessorKey: COLUMN_KEYS.viewDetails,
        header: ({ column }) => (
          <ColumnHeader
            column={column}
            title='View Details'
          />
        ),
        enableSorting: false,
        cell: ({ row }) => <ViewDetailsDialog originItems={row.original.data} />,
        size: 160
      }
    ],
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  return (
    <DataTable
      table={table}
      isStickyHeader={false}
    />
  )
}

const groupedByLengthSizeColumns: AccessorKeyColumnDef<GroupedByLengthSize>[] = [
  {
    accessorKey: COLUMN_KEYS.size,
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Size'
      />
    ),
    cell: ({ row }) => row.original.width ?? '-',
    sortingFn: (rowA, rowB) => {
      const getSize = (row: typeof rowA | typeof rowB) => {
        return row.original.width ?? 0
      }
      return getSize(rowA) - getSize(rowB)
    },
    size: 120
  },
  {
    accessorKey: COLUMN_KEYS.length,
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Length'
      />
    ),
    cell: ({ row }) => (row.original.length != null ? formatLength(row.original.length) : '-'),
    sortingFn: (rowA, rowB) => {
      const getLength = (row: typeof rowA | typeof rowB) => {
        return row.original.length ?? 0
      }
      return getLength(rowA) - getLength(rowB)
    },
    size: 120
  },
  {
    accessorKey: COLUMN_KEYS.statusComplete,
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        title='Cutting Complete'
      />
    ),
    enableSorting: false,
    cell: ({ row }) => (
      <StatusCompleteToggle
        originItems={row.original.data}
        completeStatus='cut'
      />
    ),
    size: 160
  }
]
