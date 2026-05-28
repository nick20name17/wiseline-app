import type { PackagesItems } from '@/api/packages-items/schema'
import type { DataTableProps } from '@/components/common/data-table/types'
import { OriginItemsTable } from '@/components/common/origin-items/table'

export const PackageItemsTable = ({
  data,
  isLoading,
  className
}: DataTableProps<PackagesItems>) => {
  const originItems =
    data?.map((item) => {
      return { ...item.origin_item, key: item.id + item.origin_item.id }
    }) ?? []

  return (
    <OriginItemsTable
      data={originItems}
      isLoading={isLoading}
      className={className}
      readonlyColumns={['production_date', 'flow', 'pfs']}
      columnVisibility={{
        wrapped_from: false,
        remanufacturing_from_stock_qty: false,
        remanufacturing_qty: false,
        pull_from_stock: false,
        left_to_wrap: false,
        order: false,
        customer: false,
        comments: true,
        origin_item_actions: false
      }}
    />
  )
}
