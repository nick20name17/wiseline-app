import { useRef, useState } from 'react'
import { Image as ImageIcon, Upload, X } from 'lucide-react'

import { pendingStockOrders } from '@/store/shared/stock-orders'

import { ModalHead, Overlay } from '@/components/shell/modal'
import { NumberInput } from '@/components/shell/number-input'

import { addCard, lookupProduct, nextStockOrderNo, updateCard, type StockCard } from './store'

type Draft = { pid: string; stockMin: string; orderQty: string; image: string | null }

const EMPTY: Draft = { pid: '', stockMin: '', orderQty: '', image: null }

/**
 * Add or edit a stock card.
 *
 * #217: Product ID is typed, not picked. The catalog is EBMS's, not this app's — a dropdown of every
 * id in it is unusable at real size, so the field takes an id and judges it: anything that is not an
 * active EBMS product, or already carries a card of its own, underlines red and cannot be saved.
 *
 * An image is required on a new card and optional on an edit, because an edit already has one.
 */
export const NewCardModal = ({
  open,
  editing,
  cards,
  onClose,
  onSaved
}: {
  open: boolean
  editing: StockCard | null
  cards: StockCard[]
  onClose: () => void
  onSaved: (message: string) => void
}) => {
  // the parent remounts this on open, so the draft starts from the card being edited without an effect
  const [draft, setDraft] = useState<Draft>(() =>
    editing
      ? {
          pid: editing.pid,
          stockMin: String(editing.stockMin),
          orderQty: String(editing.orderQty),
          image: editing.image
        }
      : EMPTY
  )
  const [error, setError] = useState('')
  const file = useRef<HTMLInputElement>(null)

  const product = lookupProduct(draft.pid)
  const pidTaken = cards.some(card => card.pid === draft.pid && card.id !== editing?.id)
  // half-typed is not yet wrong: the field only goes red once there is something to reject
  const pidRejected = !!draft.pid && (!product || pidTaken)
  const canSubmit =
    !!product &&
    !pidTaken &&
    +draft.stockMin > 0 &&
    +draft.orderQty > 0 &&
    (!!draft.image || !!editing)

  const submit = () => {
    if (!product) return setError('Enter a valid, active EBMS Product ID.')
    if (!(+draft.stockMin > 0)) return setError('Stock Minimum is required.')
    if (!(+draft.orderQty > 0)) return setError('Order Qty is required.')
    if (!draft.image && !editing) return setError('An image is required.')
    if (cards.some(card => card.pid === draft.pid && card.id !== editing?.id))
      return setError(`Product ID “${draft.pid}” already has a stock card.`)

    const data = {
      ...product,
      pid: draft.pid,
      stockMin: +draft.stockMin,
      orderQty: +draft.orderQty,
      image: draft.image
    }

    if (editing) {
      updateCard(editing.id, data)
      onSaved(`Stock card ${data.pid} updated`)
    } else {
      addCard(data)
      onSaved(`Stock card ${data.pid} added`)
    }
    onClose()
  }

  return (
    <Overlay id='overlay-newcard' comment='overlay-newcard' open={open} onClose={onClose}>
      <div className='modal' data-comment='newcard-modal' data-component='dialog'>
        <ModalHead
          comment='newcard-head'
          titleComment='newcard-title'
          descComment='newcard-desc'
          title={editing ? 'Edit stock card' : 'New stock card'}
          desc={
            editing
              ? `Update reorder info for ${editing.pid}.`
              : 'Add a common trim item to on-hand inventory.'
          }
          onClose={onClose}
        />
        <div className='modal-body' id='newcard-body' data-comment='newcard-body'>
          <div
            className='form-error'
            id='newcard-error'
            data-comment='newcard-error'
            style={{ display: error ? 'block' : 'none' }}
          >
            {error}
          </div>

          <div className='field' data-comment='newcard-field-pid'>
            <label
              className='field-label'
              htmlFor='newcard-pid'
              data-comment='newcard-field-pid-label'
            >
              Product ID <span className='req'>*</span>
            </label>
            {/*
              #217: typed, not picked. The `-select` anchor stays on the control that replaced the
              dropdown so comments written against it still land; the inner `-value` span had no
              equivalent inside an input and is gone.
            */}
            <input
              className={`input mono${pidRejected ? ' is-invalid' : ''}`}
              id='newcard-pid'
              data-comment='newcard-field-pid-select'
              aria-invalid={pidRejected}
              aria-describedby={pidRejected ? 'newcard-pid-help' : undefined}
              placeholder='Type a valid EBMS product ID…'
              autoComplete='off'
              spellCheck={false}
              value={draft.pid}
              onChange={event =>
                setDraft(current => ({ ...current, pid: event.target.value.toUpperCase() }))
              }
            />
            {pidRejected ? (
              <div
                className='field-help is-invalid'
                id='newcard-pid-help'
                data-comment='newcard-field-pid-help'
              >
                {pidTaken
                  ? `${draft.pid} already has a stock card.`
                  : `${draft.pid} is not an active EBMS product ID.`}
              </div>
            ) : null}
          </div>

          <div className='field' data-comment='newcard-field-desc'>
            <label className='field-label' data-comment='newcard-field-desc-label'>
              Description
            </label>
            <input
              className='input is-readonly'
              data-comment='newcard-field-desc-input'
              readOnly
              value={product?.desc ?? ''}
              placeholder='Auto-fills from Product ID'
            />
            <div className='field-help' data-comment='newcard-field-desc-help'>
              Auto-filled from EBMS · not editable
            </div>
          </div>

          {product ? (
            <div className='field' data-comment='newcard-field-derived'>
              <label className='field-label' data-comment='newcard-field-derived-label'>
                Color / gauge / dimensions
              </label>
              <div
                className='mono field-help'
                data-comment='newcard-field-derived-value'
                style={{ fontSize: '12px', color: 'var(--text-muted)' }}
              >
                {product.color} · {product.gauge}ga · {product.width}" × {product.length}"
              </div>
            </div>
          ) : null}

          <div className='field-row' data-comment='newcard-field-row-qty'>
            <div className='field' data-comment='newcard-field-stockmin' style={{ flex: 1 }}>
              <label className='field-label' data-comment='newcard-field-stockmin-label'>
                Stock Minimum <span className='req'>*</span>
              </label>
              <NumberInput
                comment='newcard-field-stockmin-input'
                min={0}
                placeholder='e.g. 100'
                value={draft.stockMin}
                onValueChange={next => setDraft(current => ({ ...current, stockMin: next }))}
              />
            </div>
            <div className='field' data-comment='newcard-field-orderqty' style={{ flex: 1 }}>
              <label className='field-label' data-comment='newcard-field-orderqty-label'>
                Order Qty <span className='req'>*</span>
              </label>
              <NumberInput
                comment='newcard-field-orderqty-input'
                min={0}
                placeholder='e.g. 250'
                value={draft.orderQty}
                onValueChange={next => setDraft(current => ({ ...current, orderQty: next }))}
              />
            </div>
          </div>

          <div className='field' data-comment='newcard-field-image'>
            <label className='field-label' data-comment='newcard-field-image-label'>
              Image{' '}
              {editing ? (
                <span className='field-optional'>(optional)</span>
              ) : (
                <span className='req'>*</span>
              )}
            </label>
            <div className='image-drop' data-comment='newcard-field-image-drop'>
              <div className='image-drop-preview' data-comment='newcard-field-image-preview'>
                {draft.image ? (
                  <img
                    src={draft.image}
                    alt='Preview'
                    data-comment='newcard-field-image-preview-img'
                  />
                ) : (
                  <ImageIcon data-comment='newcard-field-image-preview-icon' />
                )}
              </div>
              <span className='image-drop-text' data-comment='newcard-field-image-text'>
                {draft.image ? 'Image selected' : 'No image selected'}
              </span>
              <button
                type='button'
                className='btn btn-sm'
                data-comment='newcard-field-image-btn'
                onClick={() => file.current?.click()}
              >
                <Upload style={{ width: '14px', height: '14px' }} />
                {draft.image ? 'Replace' : 'Choose image'}
              </button>
              {draft.image ? (
                <button
                  type='button'
                  className='btn btn-sm btn-ghost'
                  data-comment='newcard-field-image-remove'
                  onClick={() => setDraft(current => ({ ...current, image: null }))}
                >
                  <X style={{ width: '14px', height: '14px' }} />
                  Remove
                </button>
              ) : null}
              <input
                type='file'
                id='newcard-image-file'
                accept='image/*'
                style={{ display: 'none' }}
                data-comment='newcard-field-image-input'
                ref={file}
                onChange={event => {
                  const picked = event.target.files?.[0]
                  if (!picked) return
                  const reader = new FileReader()
                  reader.onload = () =>
                    setDraft(current => ({ ...current, image: String(reader.result) }))
                  reader.readAsDataURL(picked)
                }}
              />
            </div>
          </div>
        </div>
        <div className='modal-foot' data-comment='newcard-foot'>
          <button className='btn btn-ghost' data-comment='newcard-cancel' onClick={onClose}>
            Cancel
          </button>
          <button
            className='btn btn-primary'
            id='newcard-save'
            data-comment='newcard-save'
            disabled={!canSubmit}
            onClick={submit}
          >
            {editing ? 'Save changes' : 'Add stock card'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

/**
 * What a scanned card turns into: a stock order, prefilled with the card's reorder quantity.
 *
 * It is written to the shared pending queue rather than announced in a toast — the whole point of the
 * card is that scanning it puts work in front of a department.
 */
export const CreateOrderModal = ({
  card,
  onClose,
  onCreated
}: {
  card: StockCard | null
  onClose: () => void
  onCreated: (message: string) => void
}) => {
  const [qty, setQty] = useState(() => (card ? String(card.orderQty) : ''))
  const [error, setError] = useState('')

  const submit = () => {
    if (!card) return
    if (!(+qty > 0)) return setError('Order Qty must be greater than 0.')

    const orderNo = nextStockOrderNo()
    pendingStockOrders.set([
      ...pendingStockOrders.get().filter(order => order.orderNo !== orderNo),
      {
        orderNo,
        pid: card.pid,
        desc: card.desc,
        gaugeColour: `${card.gauge}ga ${card.color}`,
        width: card.width,
        length: card.length,
        qty: +qty
      }
    ])

    onCreated(`Stock order ${orderNo} created — ${card.pid} × ${+qty}`)
    onClose()
  }

  return (
    <Overlay id='overlay-createorder' comment='overlay-createorder' open={!!card} onClose={onClose}>
      <div
        className='modal'
        style={{ maxWidth: '400px' }}
        data-comment='createorder-modal'
        data-component='dialog'
      >
        <ModalHead
          comment='createorder-head'
          titleComment='createorder-title'
          descComment='createorder-desc'
          title='Create stock order'
          desc='Prefilled from the scanned stock card.'
          onClose={onClose}
        />
        <div className='modal-body' id='createorder-body' data-comment='createorder-body'>
          <div
            className='form-error'
            id='createorder-error'
            data-comment='createorder-error'
            style={{ display: error ? 'block' : 'none' }}
          >
            {error}
          </div>
          <div className='field' data-comment='createorder-field-pid'>
            <label className='field-label' data-comment='createorder-field-pid-label'>
              Product ID
            </label>
            <input
              className='input mono is-readonly'
              data-comment='createorder-field-pid-input'
              readOnly
              value={card?.pid ?? ''}
            />
          </div>
          <div className='field' data-comment='createorder-field-desc'>
            <label className='field-label' data-comment='createorder-field-desc-label'>
              Description
            </label>
            <input
              className='input is-readonly'
              data-comment='createorder-field-desc-input'
              readOnly
              value={card?.desc ?? ''}
            />
          </div>
          <div className='field' data-comment='createorder-field-qty'>
            <label className='field-label' data-comment='createorder-field-qty-label'>
              Order Qty <span className='req'>*</span>
            </label>
            <NumberInput
              comment='createorder-field-qty-input'
              min={1}
              value={qty}
              onValueChange={setQty}
            />
          </div>
        </div>
        <div className='modal-foot' data-comment='createorder-foot'>
          <button className='btn btn-ghost' data-comment='createorder-cancel' onClick={onClose}>
            Cancel
          </button>
          <button
            className='btn btn-primary'
            id='createorder-save'
            data-comment='createorder-save'
            disabled={!(+qty > 0)}
            onClick={submit}
          >
            Create order
          </button>
        </div>
      </div>
    </Overlay>
  )
}
