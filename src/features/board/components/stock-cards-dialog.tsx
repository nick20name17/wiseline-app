import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { StockCardsPanel } from './stock-cards-panel'

type StockCardsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** The Stock Cards window the Unscheduled tab opens p1 (95,301). */
export const StockCardsDialog = ({ open, onOpenChange }: StockCardsDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className='sm:max-w-3xl'>
      <DialogHeader>
        <DialogTitle>Stock Cards</DialogTitle>
        <DialogDescription>
          Tick the cards you want and print them. Scanning a printed card — or clicking its QR —
          raises a stock order.
        </DialogDescription>
      </DialogHeader>

      <StockCardsPanel
        enabled={open}
        variant='dialog'
        actions={buttons => (
          <DialogFooter>
            <Button variant='outline' onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {buttons}
          </DialogFooter>
        )}
      />
    </DialogContent>
  </Dialog>
)
