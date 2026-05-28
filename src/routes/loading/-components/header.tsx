import { DateFilter } from '@/components/common/filters/date'
import { Header } from '@/components/layout/header'
import { TruckFilter } from '@/routes/_shipping/-components/filters/truck'

export const LoadingHeader = () => {
  return (
    <Header>
      <h1 className='font-bold'>Loading</h1>
      <div className='flex items-center gap-3.5'>
        <DateFilter />
        <TruckFilter />
      </div>
    </Header>
  )
}
