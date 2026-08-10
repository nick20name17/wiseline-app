import { ChevronDown, Clock, Copy, GripVertical, Lock, Search } from 'lucide-react'

import { Fragment } from 'react'

import { useStore } from '@/store/create-store'

import { fmtDate } from '../format'
import {
  groupOf,
  groupSlug,
  GROUPS,
  isOverdue,
  priorityById,
  queueGroupsSorted,
  supplierName,
  type QueueGroup
} from '../selectors'
import { usePopover } from '@/components/shell/pop'

import {
  completeSlitLine,
  copyCoilNumber,
  reorderQueue,
  rollformingStore,
  setQueueCoilNumber,
  setQueueSupplier,
  toggleCoilInMachine
} from '../store'
import { openCoilPick, openLotPick } from '../ui'
import { EmptyState, GroupTabs } from './bits'
import { CoilPanel } from './production'

/**
 * Which row is being dragged. Module-level because a drag starts in one row and finishes in another,
 * exactly as the prototype keeps it.
 */
const drag: { current: { date: string; key: string } | null } = { current: null }

/**
 * The Queue: every unit of released work, combined into one row wherever production date, colour,
 * gauge, profile, priority, supplier, coil number and the slit decision all agree.
 *
 * Two things read oddly until you know the rule. The rows are *not* sorted by priority even though
 * priority is a column — the Manager orders them by hand, and priority is only shown. And a Supplier or
 * Coil Number the Manager assigned is locked plain text; only a value the Worker filled in here,
 * because the Manager left it Undefined, stays on a control they can change again.
 */
const QueueRow = ({
  row,
  bucketKey,
  index,
  date,
  group,
  overdue,
  firstOfBucket
}: {
  row: QueueGroup
  bucketKey: string
  index: number
  date: string
  group: string
  overdue: boolean
  firstOfBucket: boolean
}) => {
  const currentCoil = useStore(
    rollformingStore,
    state => state.currentCoilByGroup[groupOf(row.profile)]
  )
  const role = useStore(rollformingStore, state => state.role)
  const priorities = useStore(rollformingStore, state => state.priorities)
  const suppliers = useStore(rollformingStore, state => state.suppliers)

  const priority = priorityById(row.priorityId, priorities)
  const waiting = row.needsSlit && !row.slitDone
  const inMachine = currentCoil?.key === row.key
  // checking a coil into the machine needs both halves of its identity, and material to roll
  const canCheckIn = !waiting && !!row.supplierId && !!row.coilNumber
  const key = `${bucketKey}-${index}`
  const { openPop, popNode } = usePopover()

  const pickSupplier = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    openPop<number>(
      event.currentTarget,
      [
        { label: 'Undefined', value: 0 },
        ...suppliers.map(entry => ({ label: entry.name, value: entry.id }))
      ],
      value => setQueueSupplier(row.key, value || null),
      row.supplierId ?? 0
    )
  }

  const pickCoilNumber = () =>
    openCoilPick({
      mode: 'queue',
      color: row.color,
      gauge: row.gauge,
      onPick: number => setQueueCoilNumber(row.key, number)
    })

  return (
    <tr
      className={overdue ? 'overdue' : ''}
      data-comment={`q-row-${key}`}
      onDragOver={event => {
        if (drag.current?.date !== date) return
        event.preventDefault()
        event.currentTarget.classList.add('li-dragover')
      }}
      onDragLeave={event => event.currentTarget.classList.remove('li-dragover')}
      onDrop={event => {
        event.preventDefault()
        event.currentTarget.classList.remove('li-dragover')
        const dragged = drag.current
        drag.current = null
        if (dragged?.date === date) reorderQueue(date, dragged.key, row.key, group)
      }}
    >
      <td data-comment={`q-inmach-${key}`}>
        {waiting ? null : (
          <input
            type='checkbox'
            className='chk'
            data-comment={`q-inmachchk-${key}`}
            checked={inMachine}
            disabled={!canCheckIn}
            onChange={() => toggleCoilInMachine(row.key)}
          />
        )}
      </td>
      {firstOfBucket ? (
        <td className='cell-num muted' data-comment={`q-date-${bucketKey}`}>
          {fmtDate(date)}
          {overdue ? ' ⚠' : ''}
        </td>
      ) : (
        <td data-comment={`q-datesp-${key}`} />
      )}
      <td className='mono trunc' data-comment={`q-material-${key}`}>
        {row.productId} {row.color}
      </td>
      <td className='mono trunc' data-comment={`q-profile-${key}`}>
        {row.profile}
      </td>
      <td className='mono' data-comment={`q-lf-${key}`}>
        {row.lf.toLocaleString()}
      </td>
      <td className='mono' data-comment={`q-weight-${key}`}>
        {row.weight.toLocaleString()}
      </td>
      <td data-comment={`q-pri-${key}`}>
        {priority ? (
          <span className={`pri ${priority.cls} readonly`}>
            <span className='pri-dot' />
            {priority.name}
          </span>
        ) : (
          <span className='subtle'>—</span>
        )}
      </td>
      <td data-comment={`q-sup-${key}`}>
        {waiting ? (
          <span className='subtle' style={{ fontSize: '11px' }}>
            locked
          </span>
        ) : !row.supplierId ? (
          <button
            className='field-btn is-empty'
            data-pop-anchor
            data-comment={`q-supbtn-${key}`}
            style={{ width: '100%' }}
            onClick={pickSupplier}
          >
            Undefined
            <ChevronDown />
          </button>
        ) : row.workerAssigned ? (
          <button
            className='field-btn'
            data-pop-anchor
            data-comment={`q-supbtn-${key}`}
            style={{ width: '100%' }}
            onClick={pickSupplier}
          >
            {supplierName(row.supplierId, suppliers)}
            <ChevronDown />
          </button>
        ) : (
          supplierName(row.supplierId, suppliers)
        )}
        {/* portalled out of here, so it adds no cell of its own */}
        {popNode}
      </td>
      <td data-comment={`q-coil-${key}`}>
        {waiting ? (
          <button
            className='lock-tag'
            title='Click to mark slit complete'
            data-comment={`q-slitcomplete-${key}`}
            onClick={() => completeSlitLine(row.key)}
          >
            <Clock style={{ width: '14px', height: '14px' }} />
            waiting...
          </button>
        ) : !row.coilNumber ? (
          <button
            className='field-btn is-empty'
            data-comment={`q-coilbtn-${key}`}
            disabled={!row.supplierId}
            title={row.supplierId ? undefined : 'Choose a Supplier first'}
            style={{ width: '100%' }}
            onClick={pickCoilNumber}
          >
            Undefined
            <ChevronDown />
          </button>
        ) : (
          <>
            {row.workerAssigned ? (
              <button
                className='q-coil-editable'
                title='Click to change Coil Number'
                data-comment={`q-coilbtn-${key}`}
                onClick={pickCoilNumber}
              >
                {row.coilNumber}
              </button>
            ) : (
              <span className='mono' title='Assigned by Manager — locked'>
                <Lock style={{ width: '12px', height: '12px', verticalAlign: '-1px' }} />{' '}
                {row.coilNumber}
              </span>
            )}{' '}
            <button
              className='icon-btn'
              title='Copy Coil Number'
              data-comment={`q-copycn-${key}`}
              onClick={() => copyCoilNumber(row.coilNumber)}
            >
              <Copy style={{ width: '14px', height: '14px' }} />
            </button>{' '}
            <button
              className='icon-btn'
              title='Lot Numbers'
              data-comment={`q-lotbtn-${key}`}
              onClick={() =>
                openLotPick({
                  groupKey: row.key,
                  color: row.color,
                  gauge: row.gauge,
                  coilNumber: row.coilNumber
                })
              }
            >
              <Search style={{ width: '14px', height: '14px' }} />
            </button>
          </>
        )}
      </td>
      <td data-comment={`q-slit-${key}`}>
        {row.needsSlit ? (
          row.slitDone ? (
            <span
              data-comment={`q-slitstate-${key}`}
              style={{ color: 'var(--success)', fontSize: '11px', fontWeight: 500 }}
            >
              ✓ Slit
            </span>
          ) : (
            <span
              data-comment={`q-slitstate-${key}`}
              style={{ color: 'var(--pri-by)', fontSize: '11px', fontWeight: 500 }}
            >
              🟡 Waiting for Slit Line
            </span>
          )
        ) : (
          <span className='subtle' data-comment={`q-slitstate-${key}`}>
            —
          </span>
        )}
      </td>
      <td data-comment={`q-reorder-${key}`}>
        {role === 'worker' ? null : (
          <span
            className='li-drag-handle'
            draggable
            title='Drag to reorder within this Production Date'
            data-comment={`q-drag-${key}`}
            onDragStart={event => {
              drag.current = { date, key: row.key }
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', row.key)
            }}
            onDragEnd={() => {
              drag.current = null
              document
                .querySelectorAll('.li-dragover')
                .forEach(element => element.classList.remove('li-dragover'))
            }}
          >
            <GripVertical style={{ width: '14px', height: '14px' }} />
          </span>
        )}
      </td>
    </tr>
  )
}

/** One machine's rows, bucketed per production date — a row never moves across a date. */
const QueueBuckets = ({ group }: { group: string }) => {
  const state = useStore(rollformingStore, current => current)
  const slug = groupSlug(group)

  return (
    <>
      {queueGroupsSorted(group, state).map(bucket => {
        const bucketKey = `${slug}-${bucket.date}`
        const overdue = isOverdue(bucket.date)

        return (
          <div
            key={bucket.date}
            className='table-wrap'
            data-comment={`q-daywrap-${bucketKey}`}
            style={{ marginBottom: '14px', overflowX: 'auto' }}
          >
            <table
              className='grid'
              data-comment={`q-table-${bucketKey}`}
              style={{ minWidth: '1170px' }}
            >
              <thead>
                <tr>
                  <th style={{ width: '44px' }} title='Coil in Machine' />
                  <th style={{ width: '128px' }}>Production Date</th>
                  <th style={{ width: '150px' }}>Material</th>
                  <th style={{ width: '115px' }}>Profile</th>
                  <th style={{ width: '60px' }}>LF</th>
                  <th style={{ width: '70px' }}>Weight</th>
                  <th style={{ width: '114px' }}>Priority</th>
                  <th style={{ width: '105px' }}>Supplier</th>
                  <th style={{ width: '150px' }}>Coil Number</th>
                  <th style={{ width: '160px' }}>Slit Line</th>
                  <th style={{ width: '60px' }} />
                </tr>
              </thead>
              <tbody data-comment={`q-tbody-${bucketKey}`}>
                {bucket.rows.map((row, index) => (
                  <QueueRow
                    key={row.key}
                    row={row}
                    bucketKey={bucketKey}
                    index={index}
                    date={bucket.date}
                    group={group}
                    overdue={overdue}
                    firstOfBucket={index === 0}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </>
  )
}

export const Queue = () => {
  const state = useStore(rollformingStore, current => current)
  const activeGroup = state.activeGroup

  if (activeGroup === 'All') {
    const sections = GROUPS.filter(group => queueGroupsSorted(group, state).length)

    return (
      <>
        <GroupTabs prefix='q' />
        <CoilPanel prefix='q' />
        {sections.length ? (
          sections.map(group => (
            <Fragment key={group}>
              <div
                className='subhead-title'
                data-comment={`q-allgroup-${groupSlug(group)}`}
                style={{ margin: '18px 2px 8px' }}
              >
                {group}
              </div>
              <QueueBuckets group={group} />
            </Fragment>
          ))
        ) : (
          <EmptyState
            title='Queue is empty'
            text='Release orders from the Scheduled tab to populate the Queue.'
          />
        )}
      </>
    )
  }

  const buckets = queueGroupsSorted(undefined, state)

  return (
    <>
      <GroupTabs prefix='q' />
      <CoilPanel prefix='q' />
      {buckets.length ? (
        <QueueBuckets group={activeGroup} />
      ) : (
        <EmptyState
          title={`Queue is empty for ${activeGroup}`}
          text='Release orders from the Scheduled tab to populate the Queue.'
        />
      )}
    </>
  )
}
