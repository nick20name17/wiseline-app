import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { ScanLine } from 'lucide-react'
import { useState } from 'react'
import { useCreateStockOrder, useScanStockCard } from '../api'

type Row = { id: string; quantity: string; productId: string; description: string }

// The board's modal offers nine rows and most stay blank; the blanks are dropped on create.
const ROWS = 9
const emptyRows = (): Row[] =>
  Array.from({ length: ROWS }, (_, index) => ({
    id: `row-${index}`,
    quantity: '',
    productId: '',
    description: ''
  }))

type StockOrderDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Create Stock Order: an order the shop raises on itself. It lands in Unscheduled and goes through
 * every tab after it exactly like a customer's order — it simply has no EBMS row behind it, so it
 * carries no ship date and no order note, and its customer reads «Stock».
 */
export const StockOrderDialog = ({ open, onOpenChange }: StockOrderDialogProps) => {
  const [rows, setRows] = useState<Row[]>(emptyRows)
  const [scan, setScan] = useState('')

  const create = useCreateStockOrder(() => {
    setRows(emptyRows())
    onOpenChange(false)
  })
  const scanCard = useScanStockCard()

  const setRow = (index: number, patch: Partial<Row>) =>
    setRows(current => current.map((row, at) => (at === index ? { ...row, ...patch } : row)))

  // A scanned card fills the first free row with its Product ID and Order Qty.
  const applyScan = (payload: string) =>
    scanCard.mutate(payload, {
      onSuccess: card => {
        const index = rows.findIndex(row => !row.productId.trim())
        if (index === -1) return
        setRow(index, {
          productId: card.product_id,
          quantity: card.order_qty === null ? '' : String(card.order_qty),
          description: card.description ?? ''
        })
        setScan('')
      }
    })

  const filled = rows.filter(row => row.productId.trim() && Number(row.quantity) > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Create Stock Order</DialogTitle>
          <DialogDescription>
            Type the Qty and Product ID, or scan a Stock Card to fill a row.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={event => {
            event.preventDefault()
            if (scan.trim()) applyScan(scan.trim())
          }}
        >
          <InputGroup>
            <InputGroupAddon>
              <ScanLine />
            </InputGroupAddon>
            <InputGroupInput
              aria-label='Scan a stock card'
              placeholder='Scan a Stock Card QR…'
              value={scan}
              onChange={event => setScan(event.target.value)}
            />
          </InputGroup>
        </form>

        <div className='max-h-80 overflow-y-auto rounded-lg border border-border'>
          <Table className='table-fixed'>
            <colgroup>
              <col className='w-24' />
              <col className='w-40' />
              <col />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Qty</TableHead>
                <TableHead>Product ID</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Input
                      type='number'
                      min={1}
                      inputMode='numeric'
                      aria-label={`Quantity, row ${index + 1}`}
                      value={row.quantity}
                      onChange={event => setRow(index, { quantity: event.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label={`Product ID, row ${index + 1}`}
                      placeholder='e.g. TRC8306'
                      value={row.productId}
                      onChange={event => setRow(index, { productId: event.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    {/* Not editable — it belongs to EBMS and is filled in from there on create. */}
                    <span className='truncate text-muted-foreground'>{row.description || '—'}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!filled.length || create.isPending}
            onClick={() =>
              create.mutate(
                filled.map(row => ({
                  product_id: row.productId.trim(),
                  quantity: Number(row.quantity)
                }))
              )
            }
          >
            {create.isPending ? <Spinner data-icon='inline-start' /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
