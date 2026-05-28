import { CreateLocationModal } from './actions/upsert-modal'
import { SearchFilter } from '@/components/common/filters/search'

export const LocationsFitlerBar = () => {
  return (
    <div className='flex items-center justify-between gap-3.5'>
      <SearchFilter className='w-60' />
      <CreateLocationModal />
    </div>
  )
}
