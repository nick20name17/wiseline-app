import type { Order } from '@/api/orders/schema'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'

interface DeliveryInfoProps {
  delivery: Order
  className?: string
}

export const DeliveryInfo = ({ className }: DeliveryInfoProps) => {
  return (
    <Accordion
      className={cn('bg-muted rounded-lg border px-3.5', className)}
      type='single'
      collapsible
    >
      <AccordionItem value='info'>
        <AccordionTrigger>Delivery Info:</AccordionTrigger>
        <AccordionContent>
          <h2 className='text-muted-foreground leading-none'>Note:</h2>
          <p className='mt-1 leading-normal'>
            Customer has left rented and would like this deliverd by 8:30 in the morning
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
