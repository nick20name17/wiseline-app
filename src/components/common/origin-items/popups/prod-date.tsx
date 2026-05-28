import type { Table } from '@tanstack/react-table'
import { format } from 'date-fns'
import { useState } from 'react'

import { useUpsertItem } from '@/api/items/query'
import type { OriginItem } from '@/api/origin-items/schema'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DATE_FORMAT } from '@/constants/date'

interface OriginItemProdDatePopupProps {
  table: Table<OriginItem>
}
export const OriginItemProdDatePopup = ({ table }: OriginItemProdDatePopupProps) => {
  const [date, setDate] = useState<Date | undefined>(() => new Date())

  const { handleUpsertItem } = useUpsertItem({
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
      handleUpsertItem(
        selectedRows.map(({ original: originItem }) => {
          return {
            id: originItem?.item?.id,
            payload: {
              production_date: format(date, DATE_FORMAT.iso),
              origin_item: originItem.id,
              order: originItem.origin_order
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
