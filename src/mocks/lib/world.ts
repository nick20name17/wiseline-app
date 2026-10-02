import { coils } from '../seed/coils'
import { machines } from '../seed/machines'
import { orderPlans, customers, type LineSpec, type OrderPlan, type Plan } from '../seed/orders'
import { ACCESSORIES, COLOR_CODE, PANELS, PSF, TRIM, machineForProfile } from '../seed/products'
import { users } from '../seed/users'
import { buildSeedCutlists } from './cutlists'
import { dayFromToday, stamp, workDay } from './dates'
import {
  addPackage,
  blankItem,
  ensureDeptState,
  maxPackageWeight,
  pickLocation,
  readyStatus,
  refreshLine,
  round2,
  title
} from './model'
import { seedRemans } from './stock'
import { lineNotes, lines, nextCounter, orderNotes, orders, packages } from './state'
import type { Dept, Line, Order } from './types'

export * from './model'
export * from './state'

const bendingMachines = machines.filter(row => row.department === 1 && row.kind === 'bending')

const makeLine = (order: Order, dept: Dept, spec: LineSpec): Line => {
  const [key, quantity, color, gauge, length] = spec
  const id = `LI${order.id.replace(/\D/g, '')}-${lines.filter(line => line.order === order.id).length + 1}`
  const code = color ? `-${COLOR_CODE[color] ?? 'STD'}` : ''
  const base = { id, order: order.id, dept, quantity, shipped: 0, item: null }
  if (dept === 3) {
    const [description, unit] = ACCESSORIES[key] ?? [key, 1]
    return {
      ...base,
      product_id: `${key}${code}`,
      description: color ? `${description} - ${title(color)}` : description,
      width: null,
      length: null,
      bends: 0,
      unit_weight: unit,
      color,
      gauge: null,
      profile: null,
      machine_id: null
    }
  }
  const len = length ?? 120
  const psf = PSF[gauge ?? 26] ?? 1.1563
  const trim = TRIM[key]
  const panel = PANELS[key]
  const width = trim?.[1] ?? panel?.[1] ?? 12
  const description = trim?.[0] ?? panel?.[0] ?? key
  const profile = panel?.[2] ?? null
  return {
    ...base,
    product_id: `${key}-${gauge}${code}`,
    description: `${description} ${gauge}ga ${title(color ?? '')} ${len / 12}'`,
    width,
    length: len,
    bends: trim?.[2] ?? 0,
    unit_weight: round2(((width / 12) * psf * len) / 12),
    color,
    gauge: gauge === null ? null : String(gauge),
    profile,
    machine_id: profile ? machineForProfile(profile) : null
  }
}

const coilFor = (line: Line) => {
  const gauge = Number(line.gauge)
  const lots = coils.filter(
    lot => lot.color === line.color && lot.gauge === gauge && lot.width >= 42
  )
  return lots.find(lot => lot.in_rollforming) ?? lots[0] ?? null
}

const STAGE_ORDER = ['U', 'S', 'R', 'L', 'C', 'B', 'P', 'W', 'D']
const atLeast = (plan: Plan, stage: string) =>
  STAGE_ORDER.indexOf(plan.stage) >= STAGE_ORDER.indexOf(stage)

const applyStage = (line: Line, plan: Plan, spec: LineSpec, index: number) => {
  const opts = spec[5] ?? {}
  const day = opts.day === undefined ? (plan.day ?? 0) : opts.day
  if (plan.stage === 'U' || day === null) return
  const item = blankItem()
  line.item = item
  item.production_date = workDay(day)
  item.pull_from_stock = opts.stock ?? null
  item.vented = !!opts.vent
  item.reviewed = atLeast(plan, 'R')
  item.is_released = atLeast(plan, 'L')
  // Accessories packs from the day it is scheduled; it has no release step.
  if (line.dept === 3) item.status = 'not_started'
  if (line.dept === 1 && item.reviewed) {
    item.flow =
      (bendingMachines[(index + line.bends) % bendingMachines.length] ?? bendingMachines[0])?.id ??
      null
  }
  if (line.dept === 2) {
    const mode = opts.coil ?? (atLeast(plan, 'R') ? 'coil' : 'none')
    const lot = coilFor(line)
    if (mode === 'wait') {
      item.coil_icon = 'waiting_to_slit'
      item.coil_fields_locked = true
    } else if (mode !== 'none' && lot) {
      item.supplier = lot.supplier
      item.coil_number = lot.lot_number
      item.coil_icon = mode === 'slit' ? 'slit' : 'coil'
    }
  }
  if (item.is_released) {
    item.status = 'not_started'
    if (plan.byp) {
      item.status = 'bypassed'
      item.bypassed = true
    } else if (line.dept === 1 && atLeast(plan, 'C')) {
      item.status = plan.stage === 'C' ? 'cut' : 'bent'
    }
  }
}

/** How much of each line the bench has packed: all of it, half of the second line, or none. */
const wrapPlan = (plan: Plan, need: number, index: number) => {
  if (plan.stage === 'W' || plan.stage === 'D') return need
  if (plan.stage !== 'P') return 0
  return index === 0 ? need : index === 1 ? Math.floor(need / 2) : 0
}

const packOrder = (
  order: Order,
  dept: Dept,
  plan: Plan,
  trip: OrderPlan['trip'],
  gone: boolean
) => {
  const cap = (maxPackageWeight(dept) ?? 500) * 0.8
  let batch: { line: Line; quantity: number }[] = []
  let weight = 0
  const hasLeft = trip?.status === 'en_route' || trip?.status === 'completed' || gone
  const flush = () => {
    if (!batch.length) return
    const pkg = addPackage(
      order,
      dept,
      batch,
      hasLeft ? null : pickLocation(order, dept, round2(weight), true),
      undefined,
      stamp(plan.done ?? 1, 10 + (packages.length % 6), 15)
    )
    pkg.is_loaded = hasLeft
    batch = []
    weight = 0
  }
  lines
    .filter(line => line.order === order.id && line.dept === dept)
    .forEach((line, index) => {
      let left = wrapPlan(
        plan,
        Math.max(0, line.quantity - (line.item?.pull_from_stock ?? 0)),
        index
      )
      if (line.item?.bypassed) left = 0
      while (left > 0) {
        const fit = Math.floor((cap - weight) / line.unit_weight)
        if (fit < 1) {
          flush()
          continue
        }
        const take = Math.min(left, fit)
        batch.push({ line, quantity: take })
        weight += take * line.unit_weight
        left -= take
      }
    })
  flush()
}

const build = () => {
  for (const plan of orderPlans) {
    const id = String(plan.no)
    const stock = id.startsWith('S')
    const customer = plan.cust
    const place = customers[customer]
    const order: Order = {
      id,
      invoice: stock ? id : `W${id}`,
      customer: stock ? 'Stock' : customer,
      ship_date: workDay(plan.ship),
      crea_date: dayFromToday(-(plan.made ?? 0)),
      ship_via: stock ? 'Stock' : (plan.via ?? 'Delivery'),
      po_no: plan.po ?? null,
      salesman: plan.rep,
      address: place?.address ?? '',
      city: place?.city ?? '',
      state: place?.state ?? 'OH',
      is_stock: stock,
      sales_order_id: null,
      states: {}
    }
    orders.push(order)
    if (stock) nextCounter('stockOrder')
    for (const [deptKey, dp] of Object.entries(plan.plans)) {
      const dept = Number(deptKey) as Dept
      dp.lines.forEach((spec, index) => {
        const line = makeLine(order, dept, spec)
        lines.push(line)
        applyStage(line, dp, spec, index)
      })
      if (dp.stage !== 'U') {
        const state = ensureDeptState(order, dept)
        state.priority = dp.prio ?? null
        if (dp.stage === 'D') state.completed_at = stamp(dp.done ?? 1, 15, 40)
      } else if (dp.prio) {
        ensureDeptState(order, dept).priority = dp.prio
      }
      if (['P', 'W', 'D'].includes(dp.stage)) packOrder(order, dept, dp, plan.trip, !!plan.gone)
    }
    if (plan.note) {
      orderNotes.set(id, {
        text: plan.note.text,
        author: plan.rep,
        created_at: stamp(plan.note.ago, 13, 10),
        read_at: plan.note.read ? stamp(Math.max(0, plan.note.ago - 1), 8, 30) : null
      })
    }
  }
  for (const line of lines) refreshLine(line)
  for (const line of lines) {
    // A line bent but not yet packed keeps Trim's «Bent» rather than falling back to Not Started.
    if (line.item?.is_released && !line.item.status) line.item.status = readyStatus(line.dept)
  }
}

const noteOn = (
  orderNo: string,
  lineIndex: number,
  text: string,
  authorId: number,
  ago: number,
  read: boolean
) => {
  const line = lines.filter(row => row.order === orderNo)[lineIndex]
  if (!line) return
  lineNotes.push({
    id: nextCounter('note'),
    item: line.id,
    text,
    author: authorId,
    created_at: stamp(ago, 11, 20),
    read
  })
}

build()

noteOn('41219', 0, 'Customer wants the drip edge bundled by 50, not 100.', 2, 2, false)
noteOn(
  '41219',
  3,
  'Colour matched to the sample panel from last month. Check the coil number.',
  2,
  1,
  false
)
noteOn('41226', 1, 'Pull 20 from stock, the rest is cut to order.', 1, 1, true)
noteOn('41216', 2, 'Vented valley, confirm with Dana before it goes to the Slinet.', 2, 0, false)
noteOn('41224', 0, 'Rush. Customer picks up before noon.', 1, 1, false)
noteOn('41224', 0, 'Moved to the front of the Press Brake 1 queue.', 2, 0, false)
noteOn('41229', 1, 'Waiting on slit coil, expected tomorrow morning.', 3, 1, true)

for (const note of lineNotes) {
  if (!users.some(user => user.id === note.author)) note.author = 1
}

buildSeedCutlists()
seedRemans()
