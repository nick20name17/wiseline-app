import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod/mini'

import { DEFAULT_DISPATCH, DispatchParamSchema } from '../-components/filters/dispatch'
import { LoadParamSchema } from '../-components/filters/load'
import { TruckParamSchema } from '../-components/filters/truck'
import { PackageItemsTable } from '../dispatch/-components/tables/package-items'
import { PackagesTable } from '../dispatch/-components/tables/packages'

import { ShippingFiltersBar } from './-components/filters-bar'
import { getLoadQueryOptions } from '@/api/loads/query'
import { DateParamSchema } from '@/components/common/filters/date'
import { SearchParamSchema } from '@/components/common/filters/search'

const ShippingPage = () => {
  const { dispatch = DEFAULT_DISPATCH, load: loadId } = Route.useSearch()

  const isPackages = dispatch === 'packages'
  const isItems = dispatch === 'items'

  const { data: load, isLoading } = useQuery({
    ...getLoadQueryOptions(loadId ? Number(loadId) : -1),
    enabled: !!loadId
  })

  const packagePackageItems = load?.packages?.flatMap((p) => p.package_items) ?? []
  const skidPackageItems =
    load?.skids?.flatMap((s) => s.packages.flatMap((p) => p.package_items)) ?? []

  const allPackageItems = [...packagePackageItems, ...skidPackageItems]

  const loadPackages = load?.packages ?? []
  const skidPackages =
    load?.skids?.flatMap((s) => {
      return {
        ...s.packages,
        load: s.load
      }
    }) ?? []

  const allPackages = [...loadPackages, ...skidPackages]

  return (
    <div className='flex h-full flex-col gap-4'>
      <ShippingFiltersBar />
      {isItems && (
        <PackageItemsTable
          data={allPackageItems}
          isLoading={isLoading}
        />
      )}

      {isPackages && (
        <PackagesTable
          popup='load'
          columnVisibility={{
            load_checkbox: true,
            checkbox: false
          }}
          data={allPackages ?? []}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}

export const Route = createFileRoute('/_shipping/shipping/')({
  component: ShippingPage,
  validateSearch: z.object({
    search: SearchParamSchema,
    date: DateParamSchema,
    dispatch: DispatchParamSchema,
    truck: TruckParamSchema,
    load: LoadParamSchema
  })
})
