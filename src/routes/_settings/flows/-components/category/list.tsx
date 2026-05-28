import { CreateFlowModal } from '../actions/upsert-modal'
import { FlowsList } from '../flow/list'

import type { Category } from '@/api/categories/schema'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface CategoriesListProps {
  categories: Category[]
  isLoading: boolean
}

export const CategoriesList = ({ categories, isLoading }: CategoriesListProps) => {
  if (isLoading) {
    return <CategoriesListSkeleton />
  }

  return (
    <Accordion
      type='multiple'
      className='space-y-5 pb-5'
    >
      {categories.map((category) => {
        const isAccessories = category.name === 'Accessories'
        return (
          <AccordionItem
            disabled={isAccessories}
            className='bg-secondary rounded-3xl border!'
            value={category.id?.toString()}
            key={category.id}
          >
            <AccordionTrigger
              className={cn(
                'h-20 max-h-20 items-center gap-2.5 rounded-3xl px-5 py-0',
                isAccessories ? '[&_svg]:hidden' : ''
              )}
            >
              <div className='flex items-center gap-2'>
                <div className='text-lg'>{category.name}</div>
                {isAccessories ? null : <Badge>{category.flows.length} machine(s)</Badge>}
              </div>
            </AccordionTrigger>

            <AccordionContent className='space-y-5 px-5'>
              <CreateFlowModal
                className='w-full'
                categoryId={category.id}
              />

              <FlowsList
                flows={category.flows}
                isLoading={false}
              />
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}

const CategoriesListSkeleton = () => {
  return (
    <div className='space-y-5'>
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton
          className='h-20 w-full rounded-3xl'
          key={index}
        />
      ))}
    </div>
  )
}
