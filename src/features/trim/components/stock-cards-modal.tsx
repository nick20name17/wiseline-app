import { useRef } from 'react'

import { ModalHead, Overlay } from '@/components/shell/modal'

/**
 * The Stock Cards page, hosted inside the Trim board (#198).
 *
 * It is the page itself in a frame rather than a copy of it: the cards, their QR codes and the orders
 * a scan creates all have to be the same on both, and two implementations of a printable card is two
 * cards that drift. `?embed=1` is what strips the app chrome on the other side.
 *
 * The frame is only given its `src` once, on first open, so re-opening does not reload the page and
 * lose whatever the user was in the middle of.
 */
export const StockCardsModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const src = useRef<string | null>(null)
  if (open && !src.current) src.current = '/stock-cards?embed=1'

  return (
    <Overlay id='overlay-stockcards' comment='overlay-stockcards' open={open} onClose={onClose}>
      <div
        className='modal stockcards-modal'
        data-comment='stockcards-modal'
        data-component='dialog'
      >
        <ModalHead
          comment='stockcards-head'
          titleComment='stockcards-title'
          descComment='stockcards-desc'
          title='Stock Cards'
          desc="Reorder cards for common trim items · scan a card's QR to create a stock order"
          onClose={onClose}
        />
        <div className='modal-body stockcards-body' data-comment='stockcards-body'>
          <iframe
            className='stockcards-frame'
            id='stockcards-frame'
            data-comment='stockcards-frame'
            title='Stock Cards'
            src={src.current ?? undefined}
          />
        </div>
      </div>
    </Overlay>
  )
}
