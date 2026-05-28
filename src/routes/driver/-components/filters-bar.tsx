import { DateFilter } from '@/components/common/filters/date'
import { useAuth } from '@/providers/auth'

export const DriverFilters = () => {
  const { user } = useAuth()
  return (
    <div className='container flex flex-col items-center justify-center gap-3.5 border-b pb-4'>
      <h1 className='text-center text-lg leading-none font-medium'>Hello, {user?.first_name}!</h1>
      <DateFilter
        align='center'
        showArrows
      />
    </div>
  )
}
