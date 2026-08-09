import { useState } from 'react'

import { useStore } from '@/store/create-store'

import { DIGITS, Keypad } from '@/components/shell/keypad'

import { lineOf, machineById } from '../selectors'
import { addReman, setFromStock, setWrapped, trimStore, wrapMax } from '../store'
import { closePad, showToast, trimUi } from '../ui'

/** Which quantity is being typed. The pads differ in their keys and in what Enter does with the string. */
export type PadCtx =
  | { kind: 'stock'; orderId: number; lineId: number; locked: boolean }
  | { kind: 'reman'; source: 'machine' | 'wrapping'; orderId: number; lineId: number }
  | { kind: 'wrap'; orderId: number; lineId: number }

const WRAP_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '0', '−', '⌫']

/** Digits only, so a leading zero is never meaningful and typing over a 0 replaces it. */
const digitPress = (value: string, key: string) =>
  key === '⌫' ? value.slice(0, -1) : (value + key).replace(/^0+/, '')

/**
 * The three quantity pads of the Trim board, mounted once beside the page rather than per row.
 *
 * They share a component because they share a shape; they keep separate overlays because the
 * prototype does, and each id is a comment anchor. The typed string is local state reset by `key`
 * whenever a new row opens the pad — the store holds which row, never the half-typed number.
 */
export const Keypads = () => {
  const pad = useStore(trimUi, state => state.pad)
  const key = pad ? `${pad.kind}-${pad.orderId}-${pad.lineId}` : 'none'

  return <Pad ctx={pad} key={key} />
}

const Pad = ({ ctx }: { ctx: PadCtx | null }) => {
  const [value, setValue] = useState('')
  // subscribed, not `get()`: what a pad shows is the row it is writing to
  const orders = useStore(trimStore, state => state.orders)

  const order = ctx ? orders.find(candidate => candidate.id === ctx.orderId) : null
  const item = ctx ? order?.lineItems.find(candidate => candidate.id === ctx.lineId) : null
  const open = (kind: PadCtx['kind']) => !!ctx && ctx.kind === kind && !!item

  const wrapNow = item?.wrapped || 0
  const wrapCap = item ? wrapMax(item) : 0
  const wrapResult = () => {
    const digits = Number.parseInt(value.replace(/^[+−]/, ''), 10) || 0
    const raw = value[0] === '+' ? wrapNow + digits : value[0] === '−' ? wrapNow - digits : digits
    return Math.max(0, Math.min(wrapCap, raw))
  }

  return (
    <>
      <Keypad
        id='overlay-stockpad'
        comment='stockpad'
        keyComment='stockkey'
        open={open('stock')}
        title='Pull from stock'
        desc={`Pieces from stock · 0–${item?.qty ?? 0} (Qty to make recalculates)`}
        keys={DIGITS}
        display={value || String(item?.fromStock || 0)}
        onPress={pressed => setValue(current => digitPress(current, pressed))}
        onClose={closePad}
        onEnter={() => {
          if (!ctx) return
          const next = Number.parseInt(value, 10) || 0
          setFromStock(ctx.orderId, ctx.lineId, next)
          closePad()
          showToast(
            `Stock set to ${lineOf(ctx.orderId, ctx.lineId)?.item.fromStock ?? 0} · qty to make recalculated`
          )
        }}
      />

      <Keypad
        id='overlay-remkeypad'
        comment='remkeypad'
        keyComment='remkey'
        open={open('reman')}
        title='Remanufacture'
        desc={`Pieces to remake · 1–${item?.qty ?? 0}`}
        keys={DIGITS}
        display={value || '0'}
        // verbatim: "Should only be able to enter a number between 1 and the Qty Ordered."
        onPress={pressed =>
          setValue(current => {
            const next = digitPress(current, pressed)
            const max = item?.qty ?? 0
            return Number.parseInt(next, 10) > max ? String(max) : next
          })
        }
        onClose={closePad}
        onEnter={() => {
          if (!ctx || ctx.kind !== 'reman' || !item) return
          const qty = Number.parseInt(value, 10)
          if (!qty || qty < 1) return

          addReman(ctx.source, ctx.orderId, ctx.lineId, qty)
          closePad()
          showToast(
            `Remanufacture ${qty} pcs → recut cutlist on Slinet + new bendlist on ${machineById(item.machineId)?.name || 'machine'}`
          )
        }}
      />

      {/* #185: a bare number replaces the running total, a leading + or − adjusts it — a worker who
          already logged 50 pcs types +10 rather than recomputing */}
      <Keypad
        id='overlay-wrappad'
        comment='wrappad'
        keyComment='wrapkey'
        open={open('wrap')}
        title='Wrapped'
        desc={`Now ${wrapNow} of ${wrapCap} pcs. · type a new total, or +10 / −10 to adjust`}
        keys={WRAP_KEYS}
        display={`${value || String(wrapNow)} pcs.${/^[+−]/.test(value) ? `  →  ${wrapResult()}` : ''}`}
        onPress={pressed =>
          setValue(current => {
            if (pressed === '⌫') return current.slice(0, -1)
            if (pressed === '+' || pressed === '−')
              return /^[+−]/.test(current) ? pressed + current.slice(1) : pressed + current
            return /^[+−]/.test(current)
              ? current[0] + (current.slice(1) + pressed).replace(/^0+/, '')
              : (current + pressed).replace(/^0+/, '')
          })
        }
        onClose={closePad}
        onEnter={() => {
          if (!ctx) return
          const next = value === '' ? wrapNow : wrapResult()
          setWrapped(ctx.orderId, ctx.lineId, next)
          closePad()
          showToast(`Wrapped set to ${next} pcs.`)
        }}
      />
    </>
  )
}
