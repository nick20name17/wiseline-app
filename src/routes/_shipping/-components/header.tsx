import { useLocation } from '@tanstack/react-router'

import { TruckFilter } from './filters/truck'
import { DateFilter } from '@/components/common/filters/date'
import { Header } from '@/components/layout/header'
import type { RouteNames } from '@/types/routes'

export const ShippingHeader = () => {
  const pathname = useLocation({
    select: ({ pathname }) => pathname as RouteNames
  })

  return (
    <Header>
      <h1 className='font-bold'>{pathname === '/dispatch' ? 'Dispatch' : 'Shipping'}</h1>
      <div className='flex items-center gap-3.5'>
        <DateFilter />
        <TruckFilter enforceSelection={pathname === '/dispatch' ? false : true} />
      </div>
    </Header>
  )
}
