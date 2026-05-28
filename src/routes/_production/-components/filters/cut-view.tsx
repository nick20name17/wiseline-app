import { useNavigate, useSearch } from '@tanstack/react-router'
import * as z from 'zod/mini'

import { getDefaultCategory } from '@/components/common/filters/category'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/providers/auth'

interface CutViewTabsProps {
  className?: string
}

export const CUT_VIEW_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'groupped', label: 'Groupped' },
  { value: 'orders', label: 'Orders View' },
  { value: 'manufactured', label: 'Manufactured' },
  { value: 'stock', label: 'Pull from Stock' }
] as const

const CUT_VIEW_VALUES = CUT_VIEW_OPTIONS.map((o) => o.value)

export const CUT_VIEW_DEFAULT_VALUE = 'all'

export const CutViewSchema = z.catch(z.optional(z.enum(CUT_VIEW_VALUES)), undefined)

export type CutViewParam = z.infer<typeof CutViewSchema>

const getDefaultView = (category?: string): CutViewParam =>
  category === 'wrapping' ? 'manufactured' : 'groupped'

const getTabsForCategory = (category?: string) => {
  if (category === 'wrapping') {
    return CUT_VIEW_OPTIONS.filter((o) => !['groupped', 'orders'].includes(o.value))
  }
  return CUT_VIEW_OPTIONS.filter((o) => ['groupped', 'orders'].includes(o.value))
}

export const CutViewTabs = ({ className }: CutViewTabsProps) => {
  const { user } = useAuth()
  const defaultCategory = getDefaultCategory(user)

  const { view = CUT_VIEW_DEFAULT_VALUE, category = defaultCategory } = useSearch({
    from: '/_production/'
  })
  const navigate = useNavigate({ from: '/' })

  const currentView = view ?? getDefaultView(category)
  const currentTabs = getTabsForCategory(category)

  const handleViewChange = (value: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        view: value as CutViewParam
      })
    })
  }

  return (
    <Tabs
      className={className}
      value={currentView}
      onValueChange={handleViewChange}
    >
      <TabsList>
        {currentTabs.map(({ label, value }) => (
          <TabsTrigger
            key={value}
            value={value}
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
