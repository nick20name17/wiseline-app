import {
  PageHeaderContext,
  SetPageHeaderContext,
  type PageHeader
} from '@/components/layout/page-header-context'
import { useState, type ReactNode } from 'react'

export const PageHeaderProvider = ({ children }: { children: ReactNode }) => {
  const [header, setHeader] = useState<PageHeader>({})

  return (
    <SetPageHeaderContext value={setHeader}>
      <PageHeaderContext value={header}>{children}</PageHeaderContext>
    </SetPageHeaderContext>
  )
}
