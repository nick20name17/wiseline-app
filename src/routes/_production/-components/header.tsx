import { CategoryFilter } from '@/components/common/filters/category'
import { ScheduleFilter } from '@/components/common/filters/schedule'
import { Header } from '@/components/layout/header'
import { getVisibleFeatures } from '@/config/permissions/features'
import { useAuth } from '@/providers/auth'

export const ProductionHeader = () => {
  const { user } = useAuth()

  const visibleFeatures = getVisibleFeatures(user?.role ?? 'worker')

  return (
    <Header>
      {visibleFeatures.has('scheduleFilter') ? <ScheduleFilter /> : null}
      {visibleFeatures.has('categoryFilter') ? <CategoryFilter /> : null}
    </Header>
  )
}
