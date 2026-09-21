import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Hammer } from 'lucide-react'

type PagePlaceholderProps = {
  title: string
}

/** Stands in for a nav destination whose page has not been built yet. */
export const PagePlaceholder = ({ title }: PagePlaceholderProps) => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant='icon'>
        <Hammer />
      </EmptyMedia>
      <EmptyTitle>{title}</EmptyTitle>
      <EmptyDescription>This page is not built yet.</EmptyDescription>
    </EmptyHeader>
  </Empty>
)
