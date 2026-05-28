import { useSearch } from '@tanstack/react-router'

import { DispatchFilter } from '../../-components/filters/dispatch'
import { LoadFilter } from '../../-components/filters/load'

import { CreateRouteDialog } from './dialogs/create-route'
import { ReleaseToLoadingDialog } from './dialogs/release-to-loading'

export const ShippingFiltersBar = () => {
  const { load } = useSearch({ from: '/_shipping/shipping/' })

  return (
    <div className='space-y-3.5'>
      <div className='flex items-center justify-between gap-3.5 border-b pb-3.5'>
        <LoadFilter />
        <div className='flex items-center gap-3.5'>
          <CreateRouteDialog loadId={load ? +load : undefined} />
          <ReleaseToLoadingDialog loadId={load ? +load : undefined} />
        </div>
      </div>
      <DispatchFilter />
    </div>
  )
}
