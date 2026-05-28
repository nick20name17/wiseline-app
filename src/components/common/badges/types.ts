import type { RemixiconComponentType } from '@remixicon/react'

export interface BadgeOption<T> {
  value: T
  text: string
  icon?: RemixiconComponentType
  className: string
}
