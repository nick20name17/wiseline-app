import type { UserRoles } from '@/api/users/schema'

export const FEATURE_KEYS = {
  scheduleFilter: 'scheduleFilter',
  categoryFilter: 'categoryFilter',
  flowsFilter: 'flowsFilter',
  dateFilter: 'dateFilter',
  datePopup: 'datePopup',
  weekFilter: 'weekFilter'
} as const

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS]

const HIDDEN_FEATURES: Record<UserRoles, FeatureKey[]> = {
  admin: [],
  manager: ['categoryFilter', 'flowsFilter'],
  worker: ['scheduleFilter', 'datePopup', 'weekFilter'],
  driver: [],
  client: [],
  super_manager: []
}

export const isFeatureVisible = (role: UserRoles, feature: FeatureKey): boolean => {
  return !HIDDEN_FEATURES[role].includes(feature)
}

export const getVisibleFeatures = (role: UserRoles): Set<FeatureKey> => {
  const allFeatures = Object.values(FEATURE_KEYS)
  const hidden = new Set(HIDDEN_FEATURES[role])
  return new Set(allFeatures.filter((f) => !hidden.has(f)))
}
