import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useQuery } from '@tanstack/react-query'
import { Printer, QrCode, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { stockCardsQuery, useDeleteStockCard, usePrintStockCards } from '../api'

type StockCardsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The Stock Cards panel: the printable QR labels the floor scans to raise a stock order.
 *
 * Creating one is not here. A card needs an uploaded image and the file endpoint accepts only package,
 * skid and package-item attachments, so a card cannot be created from any client today — see TODO.md.
 */
export const StockCardsDialog = ({ open, onOpenChange }: StockCardsDialogProps) => {
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const { data: cards, isPending } = useQuery({ ...stockCardsQuery, enabled: open })
  const remove = useDeleteStockCard()

  // A deleted card must not stay ticked: the count and the print payload would carry an id the
  // server no longer knows.
  const drop = (id: number) =>
    setSelected(current => {
      const next = new Set(current)
      next.delete(id)
      return next
    })
  const print = usePrintStockCards(() => {
    toast.add({
      type: 'success',
      title: `${selected.size} card${selected.size > 1 ? 's' : ''} sent to print`
    })
    setSelected(new Set())
  })

  const toggle = (id: number) =>
    setSelected(current => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>Stock Cards</DialogTitle>
          <DialogDescription>
            Tick the cards you want and print them. Scanning a printed card fills a stock order row.
          </DialogDescription>
        </DialogHeader>

        {/* The floor matches the placeholders, so the sheet does not jump when the cards arrive. */}
        <div className='scrollport max-h-96 min-h-56 overflow-y-auto'>
          {isPending ? (
            <div className='grid gap-3 sm:grid-cols-2'>
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className='h-21' />
              ))}
            </div>
          ) : cards?.length ? (
            <div className='grid gap-3 sm:grid-cols-2'>
              {cards.map(card => (
                <div
                  key={card.id}
                  className='flex items-start gap-3 rounded-lg border border-border p-3'
                >
                  <Checkbox
                    className='mt-1'
                    aria-label={`Print ${card.product_id}`}
                    checked={selected.has(card.id)}
                    onCheckedChange={() => toggle(card.id)}
                  />
                  <div className='min-w-0 flex-1'>
                    <p className='font-mono text-sm font-medium'>{card.product_id}</p>
                    <p className='truncate text-xs text-muted-foreground uppercase'>
                      {card.description ?? '—'}
                    </p>
                    <p className='mt-1 font-mono text-xs text-muted-foreground'>
                      Min {card.stock_minimum ?? '—'} · Qty {card.order_qty ?? '—'}
                    </p>
                  </div>
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    aria-label={`Delete ${card.product_id}`}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(card.id, { onSuccess: () => drop(card.id) })}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <QrCode />
                </EmptyMedia>
                <EmptyTitle>No stock cards</EmptyTitle>
                <EmptyDescription>
                  Creating a card needs an image upload the API does not offer yet.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            disabled={!selected.size || print.isPending}
            onClick={() => print.mutate([...selected])}
          >
            {print.isPending ? (
              <Spinner data-icon='inline-start' />
            ) : (
              <Printer data-icon='inline-start' />
            )}
            Print selected{selected.size ? ` (${selected.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
