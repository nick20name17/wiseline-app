import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Pencil, Plus, Printer, Search, SearchX, Trash2 } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ConfirmOverlay, type Confirm } from '@/components/shell/modal'
import { usePopover, type PopItem } from '@/components/shell/pop'
import { Toast } from '@/components/shell/toast'
import { useToast } from '@/components/shell/use-toast'

import { StockCardFace } from './card'
import { CreateOrderModal, NewCardModal } from './modals'
import {
  clearFilters,
  COLOR_NAMES,
  filterLabel,
  GAUGES,
  removeCard,
  setFilter,
  setSearch,
  stockcardsStore,
  toggleCardSelect,
  visibleCards,
  type StockCard
} from './store'

/**
 * The Stock Cards screen itself — everything below the page header.
 *
 * It is a component and not a route because two places show it: its own page, and a dialog on the Trim
 * board (#198, which says so — «React: <StockCardsPanel/> in a Dialog instead of its own route»). The
 * prototype hosts it in an `<iframe>` because there it is a second HTML document and there is no other
 * way; a second document here would mean a second copy of every store, which is how a card scanned in
 * the dialog would fail to be the same card.
 */
export const StockCardsPanel = () => {
  const state = useStore(stockcardsStore, current => current)
  const { toast, show } = useToast(2400)
  const { openPop, popNode } = usePopover()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<StockCard | null>(null)
  const [scanned, setScanned] = useState<StockCard | null>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [printing, setPrinting] = useState<StockCard[]>([])

  const cards = visibleCards(state)
  const total = state.stockCards.length
  const selected = state.selectedIds.length

  const openFilterPop = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    const items: PopItem[] = [
      { value: 'all', label: 'All colors & gauges' },
      ...COLOR_NAMES.map(name => ({ value: `color:${name}`, label: name })),
      ...GAUGES.map(gauge => ({ value: `gauge:${gauge}`, label: `${gauge}ga` }))
    ]
    openPop<string>(event.currentTarget, items, setFilter, state.filterValue)
  }

  const remove = (card: StockCard) =>
    setConfirm({
      title: 'Delete stock card?',
      desc: `This removes ${card.pid} (${card.desc}) from the list. This can’t be undone.`,
      onOk: () => {
        removeCard(card.id)
        setConfirm(null)
        show(`Stock card ${card.pid} deleted`)
      }
    })

  // the sheet the prototype builds is the cards themselves, laid out by print CSS
  const printSelected = () => {
    if (!selected) return
    setPrinting(state.stockCards.filter(card => state.selectedIds.includes(card.id)))
  }

  // printing has to wait for the sheet — and its QRs — to be on the page, so it happens after the commit
  useEffect(() => {
    if (!printing.length) return

    const root = document.getElementById('root')
    root?.classList.add('is-printing-cards')

    const done = () => {
      root?.classList.remove('is-printing-cards')
      setPrinting([])
      // afterprint also fires on cancel, so the toast claims only what is known: it reached the dialog
      show(
        `${printing.length} ${printing.length === 1 ? 'card' : 'cards'} sent to the print dialog`
      )
    }

    window.addEventListener('afterprint', done, { once: true })
    window.print()

    return () => {
      window.removeEventListener('afterprint', done)
      root?.classList.remove('is-printing-cards')
    }
  }, [printing, show])

  const root = document.getElementById('root')

  return (
    <>
      <div className='toolbar' data-comment='stock-toolbar'>
        <span className='toolbar-info' data-comment='stock-toolbar-info' id='stock-toolbar-info'>
          <b>{cards.length}</b> of {total} cards
        </span>
        <div className='toolbar-spacer' />
        <div className='search' data-comment='stock-search' data-component='input'>
          <Search style={{ width: '14px', height: '14px' }} />
          <input
            type='text'
            placeholder='Search product ID or description…'
            data-comment='stock-search-input'
            value={state.searchTerm}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
        <button
          className='select-btn'
          data-pop-anchor
          data-comment='stock-filter-btn'
          id='stock-filter-btn'
          style={{ width: 'auto', minWidth: '190px' }}
          onClick={openFilterPop}
        >
          {filterLabel(state.filterValue)}
          <ChevronDown style={{ width: '14px', height: '14px' }} />
        </button>
        <button
          className='btn'
          data-comment='stock-print-selected-btn'
          id='stock-print-selected-btn'
          disabled={selected === 0}
          onClick={printSelected}
        >
          <Printer style={{ width: '14px', height: '14px' }} />
          Print Selected{selected ? ` (${selected})` : ''}
        </button>
        <button
          className='btn btn-primary'
          data-comment='stock-new-btn'
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus style={{ width: '14px', height: '14px' }} />
          New stock card
        </button>
      </div>

      <section id='stock-grid-wrap' data-comment='stock-grid-wrap'>
        {!cards.length ? (
          <div className='table-wrap' data-comment='stock-empty-wrap'>
            <div className='empty' data-comment='stock-empty'>
              <SearchX className='empty-ico' data-comment='stock-empty-icon' />
              <h3 data-comment='stock-empty-title'>No stock cards match</h3>
              <p data-comment='stock-empty-text'>
                Try a different search term or clear the color/gauge filter.
              </p>
              <button
                className='btn'
                data-comment='stock-empty-clear'
                style={{ marginTop: '12px' }}
                onClick={clearFilters}
              >
                Clear filters
              </button>
            </div>
          </div>
        ) : (
          <div className='stock-grid' data-comment='stock-grid'>
            {cards.map(card => (
              <div className='stock-item' data-comment={`stock-item-${card.id}`} key={card.id}>
                <div className='stock-card-top' data-comment={`stock-card-${card.id}-top`}>
                  <label
                    className='stock-card-top-left'
                    data-comment={`stock-card-${card.id}-select-label`}
                  >
                    <input
                      type='checkbox'
                      className='chk'
                      data-comment={`stock-card-${card.id}-select`}
                      aria-label={`Select ${card.pid} for printing`}
                      checked={state.selectedIds.includes(card.id)}
                      onChange={() => toggleCardSelect(card.id)}
                    />
                    Print Select
                  </label>
                  <div
                    className='stock-card-top-actions'
                    data-comment={`stock-card-${card.id}-top-actions`}
                  >
                    <button
                      className='icon-btn'
                      data-comment={`stock-card-${card.id}-edit`}
                      aria-label='Edit stock card'
                      onClick={() => {
                        setEditing(card)
                        setFormOpen(true)
                      }}
                    >
                      <Pencil style={{ width: '14px', height: '14px' }} />
                    </button>
                    <button
                      className='icon-btn danger'
                      data-comment={`stock-card-${card.id}-delete`}
                      aria-label='Delete stock card'
                      onClick={() => remove(card)}
                    >
                      <Trash2 style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>
                </div>
                <StockCardFace card={card} onScan={() => setScanned(card)} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* The sheet prints eight cards to a page and is hidden on screen. It hangs off `#root` rather than
          off this panel because the print stylesheet hides everything beside it, and «beside» has to mean
          the app — which, in the dialog, this panel is a long way inside of. */}
      {root
        ? createPortal(
            <div className='wl-stockcards-host wl-print-host' data-page='stockcards'>
              <div id='print-sheet' data-comment='print-sheet'>
                {printing.map(card => (
                  <StockCardFace card={card} ctx='print' key={card.id} />
                ))}
              </div>
            </div>,
            root
          )
        : null}

      <NewCardModal
        key={formOpen ? `form-${editing?.id ?? 'new'}` : 'form-closed'}
        open={formOpen}
        editing={editing}
        cards={state.stockCards}
        onClose={() => setFormOpen(false)}
        onSaved={show}
      />
      <CreateOrderModal
        key={`order-${scanned?.id ?? 'none'}`}
        card={scanned}
        onClose={() => setScanned(null)}
        onCreated={show}
      />
      <ConfirmOverlay confirm={confirm} onClose={() => setConfirm(null)} />
      {popNode}
      <Toast message={toast.message} type={toast.type} shown={toast.shown} />
    </>
  )
}
