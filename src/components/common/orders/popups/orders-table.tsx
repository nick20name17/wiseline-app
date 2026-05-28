import type { Table } from '@tanstack/react-table'
import { format } from 'date-fns'
import { useState } from 'react'

import type { Order } from '@/api/orders/schema'
import { useUpsertSalesOrder } from '@/api/sales-orders/query'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DATE_FORMAT } from '@/constants/date'

interface OrdersTablePopupProps {
  table: Table<Order>
}
export const OrdersTablePopup = ({ table }: OrdersTablePopupProps) => {
  const [date, setDate] = useState<Date | undefined>(() => new Date())

  const { handleUpsertSalesOrders } = useUpsertSalesOrder({
    onError: () => {
      setDate(new Date())
    },
    onSuccess: () => {
      table.resetRowSelection()
    }
  })

  const selectedRows = table.getSelectedRowModel().rows
  const count = selectedRows.length

  const isVisible = count > 0

  const [open, setOpen] = useState(isVisible)

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
  }

  const handleSetDate = () => {
    if (date) {
      handleUpsertSalesOrders(
        selectedRows.map((row) => {
          return {
            id: row.original.sales_order?.id,
            payload: {
              order: row.original.id,
              production_date: format(date, DATE_FORMAT.iso)
            }
          }
        })
      )
    }

    table.resetRowSelection()
  }

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
    >
      <PopoverTrigger className='fixed bottom-60 left-1/2 z-10 -translate-x-1/2' />
      <PopoverContent className='w-70'>
        <div className='text-muted-foreground text-sm leading-none'>Row(s) selected: {count}</div>
        <div className='mt-2 flex items-center gap-2.5'>
          <DatePicker
            className='h-9 w-40'
            date={date}
            setDate={setDate}
          />
          <Button
            onClick={handleSetDate}
            className='w-20'
          >
            Set date
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
