import { PageHeaderContext, type PageHeader } from '@/components/layout/page-header-context'
import { useMemo, useState, type ReactNode } from 'react'

export const PageHeaderProvider = ({ children }: { children: ReactNode }) => {
  const [header, setHeader] = useState<PageHeader>({})
  const value = useMemo(() => ({ header, setHeader }), [header])

  return <PageHeaderContext value={value}>{children}</PageHeaderContext>
}
