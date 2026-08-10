import { useState } from 'react'

import { DIGITS, Keypad } from '@/components/shell/keypad'

import { stockGateOk } from '../selectors'
import { setLineFromStock } from '../store'
import { closePad, showToast } from '../ui'

/**
 * The two quantities the floor types: how many pieces go into a box, and how many come off the shelf.
 * They share one pad because they differ only in wording and in what Enter does with the number.
 */
export type PadCtx =
  | {
      kind: 'pkg'
      lineId: number
      profile: string
      max: number
      value: number
      onEnter: (value: number) => void
    }
  | { kind: 'stock'; orderId: number; lineId: number; profile: string; max: number; value: number }

export const RfKeypad = ({ ctx }: { ctx: PadCtx | null }) => {
  const [value, setValue] = useState(ctx?.value ? String(ctx.value) : '')

  const press = (key: string) =>
    setValue(current =>
      key === '⌫' ? current.slice(0, -1) : (current + key).replace(/^0+(?=\d)/, '')
    )

  const enter = () => {
    if (!ctx) return
    const entered = Math.min(ctx.max, Math.max(0, Number.parseInt(value, 10) || 0))

    if (ctx.kind === 'pkg') {
      ctx.onEnter(entered)
      closePad()
      return
    }

    // the gate is re-read on Enter: the pad is open long enough for a release to land under it
    if (!stockGateOk(ctx.orderId)) return closePad()

    setLineFromStock(ctx.orderId, ctx.lineId, entered)
    closePad()
    showToast(
      entered === ctx.max
        ? 'All units from Stock — Status set to Stock'
        : entered > 0
          ? `${entered} of ${ctx.max} from Stock`
          : 'Stock cleared'
    )
  }

  return (
    <Keypad
      id='overlay-kp'
      comment='kp'
      keyComment='kp-key'
      title={
        ctx?.kind === 'stock'
          ? `Qty From Stock · ${ctx.profile}`
          : `Packaging · ${ctx?.profile ?? ''}`
      }
      desc={
        ctx?.kind === 'stock'
          ? `Enter how many to pull from Stock (0–${ctx.max}). Subtracted from Qty Ordered; the remainder becomes Qty To Produce. If equal to Qty Ordered, Status auto-sets to Stock.`
          : `Enter what you want to package into a Box (0–${ctx?.max ?? 0}).`
      }
      keys={DIGITS}
      display={value || '0'}
      open={!!ctx}
      onPress={press}
      onEnter={enter}
      onClose={closePad}
    />
  )
}
