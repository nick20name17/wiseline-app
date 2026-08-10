import { ModalHead, Overlay } from '@/components/shell/modal'

import { StockCardsPanel } from '@/features/stockcards/panel'

import { showToast } from '../ui'

/**
 * The Stock Cards screen, hosted inside the Trim board (#198).
 *
 * It is the screen itself, mounted here — `StockCardsPanel`, which its own page mounts too, so the cards,
 * their QR codes and the orders a scan creates cannot drift between the two. The prototype reaches for an
 * `<iframe>` because there Stock Cards is a second HTML document; here that would buy a second copy of
 * every store, and a card scanned in this dialog would land in a Trim that only hears about it through
 * `localStorage`.
 *
 * `data-page` is what confines a page's stylesheet to it, so the panel carries the one it was written
 * for. Trim's own rules match the same class names, and the two sheets are loaded in a fixed order for
 * exactly that reason — see `styles/home-hosts-stockcards.css`.
 */
export const StockCardsModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
  <Overlay id='overlay-stockcards' comment='overlay-stockcards' open={open} onClose={onClose}>
    <div className='modal stockcards-modal' data-comment='stockcards-modal' data-component='dialog'>
      <ModalHead
        comment='stockcards-head'
        titleComment='stockcards-title'
        descComment='stockcards-desc'
        title='Stock Cards'
        desc="Reorder cards for common trim items · scan a card's QR to create a stock order"
        onClose={onClose}
      />
      <div className='modal-body stockcards-body' data-comment='stockcards-body'>
        <div className='wl-stockcards-host wl-stockcards-panel' data-page='stockcards'>
          {open ? <StockCardsPanel show={showToast} /> : null}
        </div>
      </div>
    </div>
  </Overlay>
)
