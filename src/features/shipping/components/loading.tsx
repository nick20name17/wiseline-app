import { Maximize2 } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { fmtDate } from '../format'
import {
  dateOverdue,
  loadingDays,
  loadingLoads,
  loadLabel,
  loadStatusLabel,
  loadWeight,
  orderById,
  orderMatchesSearch,
  truckById,
  truckOverdue
} from '../selectors'
import { setLoadingDay, shippingStore } from '../store'
import { EmptyState } from './bits'

/**
 * The Manager's view of what the warehouse is loading. It is a read-only roll-up on purpose — the
 * scanning itself happens at the Loading station, and the crosslink says so rather than duplicating it.
 */
export const Loading = () => {
  const loadingDay = useStore(shippingStore, state => state.loadingDay)
  const search = useStore(shippingStore, state => state.search)
  const loads = useStore(shippingStore, state => state.loads)
  const orders = useStore(shippingStore, state => state.orders)
  const trucks = useStore(shippingStore, state => state.trucks)

  const days = loadingDays(loads)
  const active =
    !loadingDay || !days.some(day => day.date === loadingDay) ? (days[0]?.date ?? null) : loadingDay

  if (!active)
    return (
      <EmptyState
        title='Nothing in Loading yet'
        text='Release a Load from the Scheduled tab (Route tab → Release To Loading) to see it here.'
        commentKey='ldg'
      />
    )

  const query = search.trim().toLowerCase()
  const loadsToday = loadingLoads(loads)
    .filter(load => load.date === active)
    .filter(
      load =>
        !query ||
        load.orderIds.some(id => {
          const order = orderById(id, orders)
          return order && orderMatchesSearch(order, search)
        })
    )
  const truckIds = [...new Set(loadsToday.map(load => load.truckId))].sort((a, b) => a - b)

  return (
    <>
      <p className='ldg-crosslink' data-comment='ldg-crosslink'>
        Manager overview — warehouse staff scan packages onto trucks at{' '}
        <a data-comment='ldg-crosslink-loading' href='loading.html'>
          the Loading station
        </a>
        .
      </p>

      <div className='day-tabs' data-comment='ldg-daytabs'>
        {days.map(day => {
          const overdue = dateOverdue(day.date, orders)

          return (
            <button
              className={`day-tab ${day.date === active ? 'active' : ''}${overdue ? ' overdue' : ''}`}
              data-comment={`ldg-daytab-${day.date}`}
              onClick={() => setLoadingDay(day.date)}
              key={day.date}
            >
              <span className='day-tab-date'>
                {fmtDate(day.date)}
                {overdue ? ' ⚠' : ''}
              </span>
              <span className='day-tab-cap mono'>
                {day.count} load{day.count !== 1 ? 's' : ''}
              </span>
            </button>
          )
        })}
      </div>

      <div className='board' data-comment='ldg-board'>
        {truckIds.map(truckId => {
          const truck = truckById(truckId, trucks)
          if (!truck) return null

          const overdue = truckOverdue(truckId, active, orders)
          const loadsForTruck = loadsToday.filter(load => load.truckId === truckId)
          const key = `${truckId}-${active}`

          return (
            <div
              className={`truck ${overdue ? 'overdue' : ''}`}
              data-comment={`ldg-truck-${key}`}
              key={truckId}
            >
              <div
                className='truck-head'
                data-comment={`ldg-truckhead-${key}`}
                style={{ cursor: 'pointer' }}
                title='Open truck detail'
              >
                <div>
                  <div className='truck-name' data-comment={`ldg-truckname-${key}`}>
                    Truck {truckId}
                    {overdue ? (
                      <>
                        {' '}
                        <span className='overdue-flag' data-comment={`ldg-overdueflag-${key}`}>
                          Overdue
                        </span>
                      </>
                    ) : null}
                  </div>
                  <div className='truck-plate' data-comment={`ldg-truckloc-${key}`}>
                    {truck.location}
                  </div>
                </div>
                <Maximize2 style={{ width: '14px', height: '14px', color: 'var(--text-subtle)' }} />
              </div>

              <div className='loadpills' data-comment={`ldg-loadpills-${key}`}>
                {loadsForTruck.map(load => (
                  <span className='loadpill' data-comment={`ldg-loadpill-${load.id}`} key={load.id}>
                    <span className={`loadpill-dot ss-dot-${load.status}`} />
                    {loadLabel(load, loads)} · {loadWeight(load, orders).toLocaleString('en-US')} lb
                    · {loadStatusLabel(load.status)}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
