import { useState } from 'react'

import { CreatePackageDialog } from '../../dialogs/create-package'

import type { OriginItem } from '@/api/origin-items/schema'
import type { DataTableProps } from '@/components/common/data-table/types'
import { OriginItemsTable } from '@/components/common/origin-items/table'

export const WrappingTable = ({ data, isLoading }: DataTableProps<OriginItem>) => {
  const [originItem, setOriginItem] = useState<OriginItem | null>(null)

  return (
    <>
      <OriginItemsTable
        className='[&_td]:not-[.skeleton]:py-0'
        data={data}
        onRowClick={(row) => setOriginItem(row.original)}
        readonlyColumns={['production_date', 'flow']}
        isLoading={isLoading}
        columnVisibility={{
          id_inven: false,
          wrapped_from: false,
          remanufacturing_from_stock_qty: false,
          remanufacturing_qty: false,
          pfs: false,
          pull_from_stock: false,
          category: false
        }}
      />
      {originItem ? (
        <CreatePackageDialog
          setOpen={() => setOriginItem(null)}
          open={!!originItem}
          originItem={originItem}
        />
      ) : null}
    </>
  )
}
