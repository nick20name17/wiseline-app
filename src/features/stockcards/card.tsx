import { useEffect, useRef } from 'react'

import { qrText, type StockCard } from './store'

/**
 * The prototype's QR, from the prototype's encoder.
 *
 * `qrcodejs` is pinned to the same 1.0.0 the prototype loads from a CDN, and it is loaded for its
 * global rather than imported as a module because that is all it publishes. Encoding the same string
 * with a different library would produce a different — still valid — code, and the pixel gate reads
 * the code, not its meaning.
 */
type QRCodeCtor = new (
  element: HTMLElement,
  options: { text: string; width: number; height: number; colorDark: string; colorLight: string }
) => unknown

/** Stands in for the drawing the real card carries. */
const ProfileSketch = () => (
  <svg
    viewBox='0 0 60 44'
    fill='none'
    stroke='#14181f'
    strokeWidth='1.6'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
  >
    <path d='M4 34 L20 10 L36 34 L56 34' />
  </svg>
)

/** The printable card itself, shown on screen and laid onto the print sheet unchanged. */
export const StockCardFace = ({
  card,
  ctx = 'stock-card',
  onScan
}: {
  card: StockCard
  ctx?: string
  onScan?: () => void
}) => {
  const prefix = `${ctx}-${card.id}`
  const print = ctx === 'print'

  return (
    <div className='stock-card' data-comment={prefix} data-component='card'>
      <div className='sc-draw' data-comment={`${prefix}-draw`}>
        {card.image ? (
          <img src={card.image} alt={`${card.pid} profile`} data-comment={`${prefix}-draw-img`} />
        ) : (
          <ProfileSketch />
        )}
      </div>
      <div className='sc-body' data-comment={`${prefix}-body`}>
        <div className='sc-idrow' data-comment={`${prefix}-idrow`}>
          <div data-comment={`${prefix}-id`}>
            <div className='sc-pid mono' data-comment={`${prefix}-pid`}>
              {card.pid}
            </div>
            <div className='sc-width' data-comment={`${prefix}-width`}>
              Width: {card.width}"
            </div>
          </div>
          <QRFrame
            card={card}
            id={`${print ? 'printqr-' : 'qr-'}${card.id}`}
            comment={`${prefix}-qr`}
            onScan={onScan}
          />
        </div>
        <div className='sc-desc' data-comment={`${prefix}-desc`}>
          {card.desc} {card.color}
        </div>
        <div className='sc-stats' data-comment={`${prefix}-stats`}>
          <div className='sc-stat' data-comment={`${prefix}-stockmin-wrap`}>
            <div className='sc-stat-label'>STOCK MINIMUM</div>
            <div className='sc-stat-num mono' data-comment={`${prefix}-stockmin`}>
              {card.stockMin}
            </div>
          </div>
          <div className='sc-stat' data-comment={`${prefix}-orderqty-wrap`}>
            <div className='sc-stat-label'>ORDER QTY</div>
            <div className='sc-stat-num mono' data-comment={`${prefix}-orderqty`}>
              {card.orderQty}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const QRFrame = ({
  card,
  id,
  comment,
  onScan
}: {
  card: StockCard
  id: string
  comment: string
  onScan?: () => void
}) => {
  const slot = useRef<HTMLDivElement>(null)
  const scan = !id.startsWith('printqr-')

  useEffect(() => {
    const element = slot.current
    const QRCode = (window as { QRCode?: QRCodeCtor }).QRCode
    if (!element || !QRCode) return

    element.innerHTML = ''
    new QRCode(element, {
      text: qrText(card),
      width: 96,
      height: 96,
      colorDark: '#14181f',
      colorLight: '#ffffff'
    })
  }, [card])

  return (
    <div
      className={`stock-qr${scan ? ' sc-qr-scan' : ''}`}
      id={id}
      data-comment={comment}
      ref={slot}
      title={scan ? 'Scan (or click) to create a stock order' : undefined}
      onClick={scan ? onScan : undefined}
    />
  )
}
