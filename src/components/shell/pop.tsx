import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'

export type PopItem = {
  value: string | number
  label: string
  /** A taken product id, say: listed so it is visible, but not pickable. */
  disabled?: boolean
  badge?: string
  /** A colour swatch before the label — what a priority list is read by before its name. */
  dot?: string
}

type PopState = {
  anchor: HTMLElement
  items: PopItem[]
  current?: string | number
  onPick: (value: never) => void
}

/**
 * The prototype's dropdown, which is a positioned list rather than a native `<select>`.
 *
 * It is portalled into `#root` and not into `<body>`: every page's stylesheet is scoped to
 * `[data-page="…"]`, which `#root` carries, so a popover parked on the body would come out unstyled.
 * `scope` moves it for the same reason `Overlay` takes one (#123) — a screen hosted inside another
 * page carries its own scope somewhere below `#root`, and that is the element its dropdowns belong in.
 *
 * Position is measured from the anchor at open time and clamped to the viewport, exactly as the
 * prototype does it — the list is `position: fixed`, so it does not move with a scrolled panel, and
 * scrolling closes it for that reason.
 */
export const usePopover = (scope?: HTMLElement | null) => {
  const [pop, setPop] = useState<PopState | null>(null)

  const closePop = useCallback(() => setPop(null), [])

  const openPop = useCallback(
    <T extends string | number>(
      anchor: HTMLElement,
      items: PopItem[],
      onPick: (value: T) => void,
      current?: string | number
    ) => setPop({ anchor, items, current, onPick: onPick as (value: never) => void }),
    []
  )

  return {
    pop,
    openPop,
    closePop,
    popNode: pop ? <Pop pop={pop} onClose={closePop} scope={scope} /> : null
  }
}

const Pop = ({
  pop,
  onClose,
  scope
}: {
  pop: PopState
  onClose: () => void
  scope?: HTMLElement | null
}) => {
  const [element, setElement] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const dismiss = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (element?.contains(target) || target.closest('[data-pop-anchor]')) return
      onClose()
    }
    const scrolled = (event: Event) => {
      if ((event.target as HTMLElement | null)?.closest?.('.pop')) return
      onClose()
    }
    const escaped = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('click', dismiss)
    window.addEventListener('scroll', scrolled, true)
    document.addEventListener('keydown', escaped)
    return () => {
      document.removeEventListener('click', dismiss)
      window.removeEventListener('scroll', scrolled, true)
      document.removeEventListener('keydown', escaped)
    }
  }, [element, onClose])

  const root = scope ?? document.getElementById('root')
  if (!root) return null

  const rect = pop.anchor.getBoundingClientRect()
  const height = element?.offsetHeight ?? 0
  const width = element?.offsetWidth ?? 0

  return createPortal(
    <div
      className='pop'
      data-comment='dropdown-popover'
      data-component='dropdown-menu'
      ref={setElement}
      style={{
        top: `${Math.min(rect.bottom + 5, window.innerHeight - height - 10)}px`,
        left: `${Math.min(rect.left, window.innerWidth - width - 10)}px`,
        width: `${Math.max(180, rect.width)}px`
      }}
    >
      {pop.items.map((item, index) => (
        <button
          className={`pop-item ${item.value === pop.current ? 'selected' : ''}${item.disabled ? ' disabled' : ''}`}
          data-comment={`dropdown-item-${index}`}
          aria-disabled={item.disabled || undefined}
          onClick={event => {
            event.stopPropagation()
            if (item.disabled) return
            pop.onPick(item.value as never)
            onClose()
          }}
          key={item.value}
        >
          {item.dot ? <span className='pri-dot' style={{ background: item.dot }} /> : null}
          <span>{item.label}</span>
          {item.badge ? (
            <span className='chip' style={{ marginLeft: 'auto' }}>
              {item.badge}
            </span>
          ) : null}
          {item.value === pop.current ? <Check className='pop-check' /> : null}
        </button>
      ))}
    </div>,
    root
  )
}
