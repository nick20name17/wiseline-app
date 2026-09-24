import { StockCardsPanel } from './stock-cards-panel'

/**
 * Stock Cards on a page of their own, for printing a batch without going through the Trim board.
 * The board only has the window p1 (95,301); this is the same panel, given the page's width.
 */
export const StockCardsPage = () => (
  <section className='flex flex-col gap-4'>
    <StockCardsPanel
      enabled
      variant='page'
      actions={buttons => <div className='flex justify-end gap-2 max-sm:flex-wrap'>{buttons}</div>}
    />
  </section>
)
