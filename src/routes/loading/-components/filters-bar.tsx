import { RouteLoadFilter } from './filters/route-load'
import { DispatchFilter } from '@/routes/_shipping/-components/filters/dispatch'

export const LoadingFiltersBar = () => {
  return (
    <div className='space-y-3.5'>
      <div className='flex items-center justify-between gap-3.5 border-b pb-3.5'>
        <RouteLoadFilter />
      </div>
      <DispatchFilter without={['packages', 'order']} />
    </div>
  )
}
