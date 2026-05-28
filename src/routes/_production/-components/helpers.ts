import type { ProductCategory, User } from '@/api/users/schema'
import { getVisibleFeatures } from '@/config/permissions/features'

interface CategoryFilter {
  category: string | undefined
  user: User | null
}

export const getCategoryFilter = ({ category, user }: CategoryFilter) => {
  if (!category || category === 'wrapping' || category === 'all') return undefined

  const visibleFeatures = getVisibleFeatures(user?.role ?? 'worker')

  if (!user) {
    return visibleFeatures.has('categoryFilter') ? category : undefined
  }

  switch (user.role) {
    case 'admin':
    case 'super_manager':
    case 'client':
      return category

    case 'manager':
      return user.prod_types?.length ? user.prod_types.join(',') : undefined

    case 'worker':
      return user.prod_types?.includes(category as ProductCategory) ? category : undefined

    default:
      return visibleFeatures.has('categoryFilter') ? category : undefined
  }
}
