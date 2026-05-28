import { CreatePriorityModal } from './actions/upsert-modal'
import { SearchFilter } from '@/components/common/filters/search'

export const PrioritiesFitlerBar = () => {
  return (
    <div className='flex items-center justify-between gap-3.5'>
      <SearchFilter className='w-60' />
      <CreatePriorityModal />
    </div>
  )
}
