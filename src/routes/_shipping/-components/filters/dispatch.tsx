import * as z from 'zod/mini'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSearchParams } from '@/hooks/use-search-params'

export const DISPATCH_TABS_OPTIONS = [
  { value: 'order', label: 'Orders' },
  {
    value: 'items',
    label: 'Line Items'
  },
  {
    value: 'packages',
    label: 'Packages'
  },
  {
    value: 'pack-skid',
    label: 'Packages & Skids'
  }
] as const

const DISPATCH_TABS_VALUES = DISPATCH_TABS_OPTIONS.map(({ value }) => value)

export const DEFAULT_DISPATCH = 'items'

export const DispatchParamSchema = z._default(
  z.catch(z.enum(DISPATCH_TABS_VALUES), DEFAULT_DISPATCH),
  DEFAULT_DISPATCH
)

export type DispatchFilterParam = z.infer<typeof DispatchParamSchema>

interface DispatchFilterProps {
  without?: DispatchFilterParam[]
  dispatch?: DispatchFilterParam
  setDispatch?: React.Dispatch<React.SetStateAction<DispatchFilterParam>>
}

export const DispatchFilter = ({
  without = ['pack-skid', 'order'],
  dispatch: externalDispatch,
  setDispatch: externalSetDispatch
}: DispatchFilterProps) => {
  const [{ dispatch: internalDispatch }, setSearchParams] = useSearchParams()

  const value = externalDispatch ?? internalDispatch

  const handleDispatchChange = (next: DispatchFilterParam) => {
    if (externalSetDispatch) {
      externalSetDispatch(next)
    } else {
      setSearchParams({ dispatch: next })
    }
  }

  return (
    <Tabs
      value={value}
      onValueChange={(value) => handleDispatchChange(value as DispatchFilterParam)}
    >
      <TabsList>
        {DISPATCH_TABS_OPTIONS.filter(({ value }) => !without.includes(value)).map(
          ({ value, label }) => (
            <TabsTrigger
              key={value}
              value={value}
            >
              {label}
            </TabsTrigger>
          )
        )}
      </TabsList>
    </Tabs>
  )
}
