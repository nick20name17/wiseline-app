import { createFileRoute } from '@tanstack/react-router'

import { viewingAsLabel } from '@/session/nav-visibility'
import { usePage } from '@/session/use-page'
import { useViewer } from '@/session/use-viewer'
import { useStore } from '@/store/create-store'

import { Sidebar } from '@/components/shell/chrome'
import { Toast } from '@/components/shell/toast'
import { useToast } from '@/components/shell/use-toast'

import { StockCardsPanel } from '@/features/stockcards/panel'
import { stockcardsStore } from '@/features/stockcards/store'

import '@/styles/stockcards.css'
import '@/styles/stockcards.port.css'

export const Route = createFileRoute('/_authenticated/stock-cards')({
  component: Stockcards
})

/**
 * The reorder cards for common trim items, one printable card each.
 *
 * The card on screen is the card that prints — the same face, laid onto its own 3-1/4" x 2-1/4" page
 * — so nothing about it is screen-only decoration. Its QR encodes the product, which is what makes a
 * scan on the floor turn into a stock order for the right item however many times the card is
 * reprinted.
 *
 * This route is the page around the screen; the screen itself is `StockCardsPanel`, because Trim hosts
 * the same one in a dialog.
 */
function Stockcards() {
  usePage('stockcards')

  const total = useStore(stockcardsStore, state => state.stockCards.length)
  const viewer = useViewer()
  // the prototype's toast is the last child of its body, and this route stands in for that body
  const { toast, show } = useToast(2400)

  return (
    <>
      <div className='app' data-comment='app-shell'>
        <Sidebar
          current='/stock-cards'
          role={viewer?.role ?? 'admin'}
          department={viewer?.department ?? 'all'}
          roleLabel={viewingAsLabel(viewer?.role ?? 'admin', viewer?.department ?? 'all')}
        />

        <div className='main' data-comment='main'>
          <header className='topbar' data-comment='topbar'>
            <div className='crumb' data-comment='topbar-crumb'>
              <strong data-comment='topbar-crumb-root'>Stock Cards</strong>
            </div>
            <div className='topbar-right' data-comment='topbar-right'>
              <div className='avatar' data-comment='topbar-avatar' title='John Enns'>
                JE
              </div>
            </div>
          </header>

          <div className='dept-bar' data-comment='dept-bar'>
            <div className='dept-title-row' data-comment='dept-title-row'>
              <h1 className='dept-title' data-comment='dept-title'>
                Stock Cards
              </h1>
              <span className='dept-chip mono' data-comment='dept-chip' id='dept-chip-count'>
                {total} {total === 1 ? 'card' : 'cards'}
              </span>
            </div>
            <p className='dept-subtitle' data-comment='dept-subtitle'>
              Reorder cards for common trim items · scan a card's QR to create a stock order
            </p>
          </div>

          <main className='content' data-comment='content'>
            <StockCardsPanel show={show} />
          </main>
        </div>
      </div>
      <Toast message={toast.message} type={toast.type} shown={toast.shown} />
    </>
  )
}
