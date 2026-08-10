import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Maximize2
} from 'lucide-react'

import { useEffect } from 'react'

import { useStore } from '@/store/create-store'

import { fmtDate } from '../format'
import {
  dateOverdue,
  loadLabel,
  loadWeight,
  orderOverdue,
  schedDays,
  scheduledOrders,
  sumWeight,
  truckById
} from '../selectors'
import {
  schedCalShift,
  schedCalStore,
  setSchedDay,
  shippingStore,
  toggleSchedCal,
  TODAY
} from '../store'
import { openSchedTruck } from '../ui'
import { EmptyState } from './bits'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const iso = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

/**
 * The board's month grid. Only a day something is scheduled on is clickable; the rest are dead
 * buttons rather than missing ones, so the month keeps its shape.
 */
const SchedCalendar = ({ active }: { active: string }) => {
  const { month, year } = useStore(schedCalStore, state => state)
  const orders = useStore(shippingStore, state => state.orders)
  const loads = useStore(shippingStore, state => state.loads)

  const scheduled = new Set(
    scheduledOrders(orders, loads)
      .map(order => order.shipDate)
      .filter(Boolean)
  )
  const startDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()

  return (
    <div className='sch-calendar' data-comment='sch-calendar'>
      <div className='cal-head' data-comment='schcal-head'>
        <button className='cal-nav' data-comment='schcal-prev' onClick={() => schedCalShift(-1)}>
          <ChevronLeft style={{ width: '14px', height: '14px' }} />
        </button>
        <div className='cal-month' data-comment='schcal-month'>
          {MONTHS[month]} {year}
        </div>
        <button className='cal-nav' data-comment='schcal-next' onClick={() => schedCalShift(1)}>
          <ChevronRight style={{ width: '14px', height: '14px' }} />
        </button>
      </div>
      <div className='cal-grid' data-comment='schcal-grid'>
        {DOW.map((day, index) => (
          <div className='cal-dow' data-comment={`schcal-dow-${index}`} key={index}>
            {day}
          </div>
        ))}
        {Array.from({ length: startDow }, (_, index) => (
          <button
            className='cal-day other'
            data-comment={`schcal-prev-${index}`}
            disabled
            key={index}
          >
            {prevDays - startDow + index + 1}
          </button>
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const date = iso(year, month, index + 1)
          const isSched = scheduled.has(date)
          const cls = [
            date === TODAY ? 'today' : '',
            isSched ? 'scheduled' : '',
            dateOverdue(date, orders) ? 'overdue' : '',
            date === active ? 'selected' : ''
          ].join(' ')

          return (
            <button
              className={`cal-day ${cls}`}
              data-comment={`schcal-day-${date}`}
              disabled={!isSched}
              onClick={isSched ? () => setSchedDay(date) : undefined}
              key={date}
            >
              {index + 1}
            </button>
          )
        })}
      </div>
      <div className='sch-cal-legend' data-comment='schcal-legend'>
        <span className='sch-cal-key'>
          <span className='sch-cal-swatch sched' />
          Scheduled
        </span>
        <span className='sch-cal-key'>
          <span className='sch-cal-swatch overdue' />
          Overdue
        </span>
      </div>
    </div>
  )
}

/** One truck's day: what is on it, what it can carry, and what is not yet on a Load. */
const TruckCard = ({ truckId, active }: { truckId: number; active: string }) => {
  const allOrders = useStore(shippingStore, state => state.orders)
  const allLoads = useStore(shippingStore, state => state.loads)
  const trucks = useStore(shippingStore, state => state.trucks)
  const truck = truckById(truckId, trucks)
  if (!truck) return null

  const all = scheduledOrders(allOrders, allLoads)
  const scope = active === 'all' ? all : all.filter(o => o.shipDate === active)
  const orders = scope.filter(order => order.truckId === truckId)
  const delivery = orders.filter(order => !order.pickup)
  const pickups = orders.filter(order => order.pickup)
  const deliveryWeight = sumWeight(delivery)
  const pickupWeight = sumWeight(pickups)
  const unassignedDel = delivery.filter(order => !order.loadId)
  const unassignedPick = pickups.filter(order => !order.loadId)

  const over = deliveryWeight + pickupWeight > truck.maxWeight
  // Supplier Pickups carry their own weight signal, independent of the delivery orders: orange only
  // once the pickups alone pass the truck's limit.
  const pickOver = pickupWeight > truck.maxWeight
  const unassignedPickOver = sumWeight(unassignedPick) > truck.maxWeight
  const truckOverdue = orders.some(orderOverdue)
  const delZero = unassignedDel.length === 0
  const pickZero = unassignedPick.length === 0

  const loadsHere = allLoads.filter(
    load =>
      load.truckId === truckId &&
      load.status === 'unreleased' &&
      (active === 'all' || load.date === active) &&
      orders.some(order => order.loadId === load.id)
  )

  const capPct = Math.min(
    100,
    Math.round(((deliveryWeight + pickupWeight) / truck.maxWeight) * 100)
  )
  const key = `${truckId}-${active}`

  return (
    <div className={`truck ${truckOverdue ? 'overdue' : ''}`} data-comment={`sch-truck-${key}`}>
      <div
        className='truck-head'
        data-comment={`sch-truckhead-${key}`}
        style={{ cursor: 'pointer' }}
        title='Open truck detail'
        onClick={() => openSchedTruck({ truckId, date: active })}
      >
        <div>
          <div className='truck-name' data-comment={`sch-truckname-${key}`}>
            Truck {truckId}
            {truckOverdue ? (
              <>
                {' '}
                <span className='overdue-flag' data-comment={`sch-overdueflag-${key}`}>
                  Overdue
                </span>
              </>
            ) : null}
          </div>
          <div className='truck-plate' data-comment={`sch-truckloc-${key}`}>
            {truck.location}
          </div>
        </div>
        <Maximize2 style={{ width: '14px', height: '14px', color: 'var(--text-subtle)' }} />
      </div>

      <div className='truck-stats' data-comment={`sch-truckstats-${key}`}>
        <div className='truck-stats-title'>Scheduled</div>
        <div className='truck-stat-row'>
          <span>Delivery Orders</span>
          <span className={`mono ${over ? 'over-txt' : ''}`}>
            {delivery.length} · {deliveryWeight.toLocaleString('en-US')} lb
          </span>
        </div>
        <div className='truck-stat-row'>
          <span>Pickups</span>
          <span
            className={`mono ${pickOver ? 'over-txt' : ''}`}
            data-comment={`sch-truckpickw-${key}`}
          >
            {pickups.length} · {pickupWeight.toLocaleString('en-US')} lb{pickOver ? ' 🟠' : ''}
          </span>
        </div>
      </div>

      <div className='truck-cap' data-comment={`sch-cap-${key}`}>
        <div className='truck-cap-head'>
          <span>Truck capacity</span>
          <span className={`mono ${over ? 'over-txt' : ''}`}>
            {(deliveryWeight + pickupWeight).toLocaleString('en-US')} /{' '}
            {truck.maxWeight.toLocaleString('en-US')} lb · {capPct}%
          </span>
        </div>
        <div className='weight-bar' data-comment={`sch-weightbar-${key}`}>
          <span className={over ? 'wb-over' : 'wb-ok'} style={{ width: `${capPct}%` }} />
        </div>
      </div>

      <div className='truck-stats' data-comment={`sch-truckunassigned-${key}`}>
        <div className='truck-stats-title'>Not Yet Assigned to a Load</div>
        <div className='truck-stat-row' data-comment={`sch-truckunassigned-del-${key}`}>
          <span>Delivery Orders</span>
          <span className={`mono ${delZero ? 'truck-stat-ok' : ''}`}>
            {delZero ? <span className='stat-ok-check'>✓</span> : null}
            {unassignedDel.length} · {sumWeight(unassignedDel).toLocaleString('en-US')} lb
          </span>
        </div>
        <div className='truck-stat-row' data-comment={`sch-truckunassigned-pick-${key}`}>
          <span>Pickups</span>
          <span
            className={`mono ${pickZero ? 'truck-stat-ok' : unassignedPickOver ? 'over-txt' : ''}`}
          >
            {pickZero ? <span className='stat-ok-check'>✓</span> : null}
            {unassignedPick.length} · {sumWeight(unassignedPick).toLocaleString('en-US')} lb
            {unassignedPickOver ? ' 🟠' : ''}
          </span>
        </div>
      </div>

      {loadsHere.length ? (
        <div className='loadpills' data-comment={`sch-loadpills-${key}`}>
          {loadsHere.map(load => (
            <span className='loadpill' data-comment={`sch-loadpill-${load.id}`} key={load.id}>
              <span className='loadpill-dot ss-dot-unreleased' />
              {loadLabel(load, allLoads)} · {loadWeight(load, allOrders).toLocaleString('en-US')} lb
              · Unreleased
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/**
 * The day board: a month picker, the days something ships on, and every truck for the chosen day.
 *
 * All four trucks always render, an empty one with a zero roll-up rather than not at all — the board
 * is the fleet, and a truck vanishing when it has nothing on it reads as a truck that is gone.
 */
export const Scheduled = () => {
  const scheduledDay = useStore(shippingStore, state => state.scheduledDay)
  const calOpen = useStore(schedCalStore, state => state.open)
  const orders = useStore(shippingStore, state => state.orders)
  const loads = useStore(shippingStore, state => state.loads)
  const trucks = useStore(shippingStore, state => state.trucks)

  const days = schedDays(orders, loads)
  const active =
    scheduledDay !== 'all' && !days.some(day => day.date === scheduledDay)
      ? (days[0]?.date ?? 'all')
      : scheduledDay

  // close on an outside click; the prototype binds this at the document too, and skips a target the
  // re-render has already detached — `closest()` on a detached node is null, which would self-close
  useEffect(() => {
    if (!calOpen) return

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.isConnected && !target.closest('[data-comment="sch-cal-wrap"]'))
        schedCalStore.set({ open: false })
    }

    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [calOpen])

  const all = scheduledOrders(orders, loads)
  const scope = active === 'all' ? all : all.filter(o => o.shipDate === active)

  return (
    <>
      <div className='sch-cal-wrap' data-comment='sch-cal-wrap'>
        <button className='field-btn' data-comment='sch-cal-trigger' onClick={toggleSchedCal}>
          <Calendar style={{ width: '14px', height: '14px' }} />
          {active === 'all' ? 'All Scheduled Orders' : fmtDate(active)}
          {calOpen ? (
            <ChevronUp style={{ width: '14px', height: '14px' }} />
          ) : (
            <ChevronDown style={{ width: '14px', height: '14px' }} />
          )}
        </button>
        {calOpen ? (
          <div className='sch-cal-pop' data-comment='sch-cal-pop'>
            <SchedCalendar active={active} />
          </div>
        ) : null}
      </div>

      <div className='day-tabs' data-comment='sch-daytabs'>
        <button
          className={`day-tab ${active === 'all' ? 'active' : ''}`}
          data-comment='sch-daytab-all'
          onClick={() => setSchedDay('all')}
        >
          <span className='day-tab-date'>All Scheduled Orders</span>
        </button>
        {days.map(day => {
          const overdue = dateOverdue(day.date, orders)

          return (
            <button
              className={`day-tab ${day.date === active ? 'active' : ''}${overdue ? ' overdue' : ''}`}
              data-comment={`sch-daytab-${day.date}`}
              onClick={() => setSchedDay(day.date)}
              key={day.date}
            >
              <span className='day-tab-date'>
                {fmtDate(day.date)}
                {overdue ? ' ⚠' : ''}
              </span>
              <span className='day-tab-cap mono'>
                {day.count} order{day.count !== 1 ? 's' : ''}
              </span>
            </button>
          )
        })}
      </div>

      {!scope.length ? (
        <EmptyState
          title='Nothing scheduled here'
          text='Select orders from Unscheduled and click Schedule to assign a truck and ship date.'
          commentKey='sch'
        />
      ) : (
        <div className='board' data-comment='sch-board'>
          {trucks
            .map(truck => truck.id)
            .sort((a, b) => a - b)
            .map(truckId => (
              <TruckCard truckId={truckId} active={active} key={truckId} />
            ))}
        </div>
      )}
    </>
  )
}
