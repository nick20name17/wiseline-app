import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ChevronDown, Pencil, Plus, Printer, Search, SearchX, Trash2 } from 'lucide-react'

import { viewingAsLabel } from '@/session/nav-visibility'
import { usePage } from '@/session/use-page'
import { useViewer } from '@/session/use-viewer'
import { useStore } from '@/store/create-store'

import { Sidebar } from '@/components/shell/chrome'
import { ConfirmOverlay, type Confirm } from '@/components/shell/modal'
import { usePopover, type PopItem } from '@/components/shell/pop'
import { Toast } from '@/components/shell/toast'
import { useToast } from '@/components/shell/use-toast'

import { CreateOrderModal, NewCardModal } from '@/features/stockcards/modals'

import type { StockCard } from '@/features/stockcards/store'

import { StockCardFace } from '@/features/stockcards/card'
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
  visibleCards
} from '@/features/stockcards/store'

import '@/styles/stockcards.css'

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
 */
function Stockcards() {
  usePage('stockcards')

  const state = useStore(stockcardsStore, current => current)
  const viewer = useViewer()
  const { toast, show } = useToast(2400)
  const { openPop, popNode } = usePopover()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<StockCard | null>(null)
  const [scanned, setScanned] = useState<StockCard | null>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)

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
    window.print()
  }

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
            <div className='toolbar' data-comment='stock-toolbar'>
              <span
                className='toolbar-info'
                data-comment='stock-toolbar-info'
                id='stock-toolbar-info'
              >
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
                    <div
                      className='stock-item'
                      data-comment={`stock-item-${card.id}`}
                      key={card.id}
                    >
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
          </main>
        </div>
      </div>

      {/* filled by Print Selected, one card per page; hidden on screen */}
      <div id='print-sheet' data-comment='print-sheet' />

      <NewCardModal
        key={formOpen ? `form-${editing?.id ?? 'new'}` : 'form-closed'}
        open={formOpen}
        editing={editing}
        cards={state.stockCards}
        onClose={() => setFormOpen(false)}
        onSaved={show}
      />
      <CreateOrderModal key={`order-${scanned?.id ?? 'none'}`} card={scanned} onClose={() => setScanned(null)} onCreated={show} />
      <ConfirmOverlay confirm={confirm} onClose={() => setConfirm(null)} />
      {popNode}
      <Toast message={toast.message} type={toast.type} shown={toast.shown} />
    </>
  )
}
