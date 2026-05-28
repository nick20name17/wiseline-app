import { useNavigate, useSearch } from '@tanstack/react-router'
import { format } from 'date-fns'

import { DEFAULT_DATE_VALUE } from '@/components/common/filters/date'
import { NavMenu } from '@/components/layout/header/nav-menu'
import { NavUser } from '@/components/layout/header/nav-user'
import { DatePicker } from '@/components/ui/date-picker'
import { DATE_FORMAT } from '@/constants/date'
import { LoadSelect } from '@/routes/_shipping/-components/selects/load-select'
import { TruckSelect } from '@/routes/_shipping/-components/selects/truck-select'

export const ScannerHeader = () => {
  const { load, truck, date = DEFAULT_DATE_VALUE } = useSearch({ from: '/scanner/' })
  const navigate = useNavigate({ from: '/scanner/' })

  return (
    <header className='container space-y-4 py-(--header-y-offset)'>
      <div className='flex items-center justify-between gap-4'>
        <NavMenu />
        <NavUser />
      </div>
      <div className='flex flex-wrap items-center justify-center gap-3.5'>
        <DatePicker
          className='h-9 w-full sm:w-58'
          date={date ? new Date(date) : undefined}
          setDate={(date) =>
            navigate({
              search: (prev) => ({
                ...prev,
                date: date ? format(date, DATE_FORMAT.iso) : undefined
              })
            })
          }
        />
        <TruckSelect
          className='w-full sm:w-58'
          onChange={(value) => navigate({ search: (prev) => ({ ...prev, truck: value }) })}
          value={truck ?? ''}
        />
        <LoadSelect
          withoutCreate
          filters={{
            releaseToLoading: true
          }}
          className='w-full sm:w-58'
          date={date ?? ''}
          truckId={truck ?? ''}
          onChange={(value) => {
            navigate({ search: (prev) => ({ ...prev, load: value }) })
          }}
          value={load ?? ''}
        />
      </div>
    </header>
  )
}
