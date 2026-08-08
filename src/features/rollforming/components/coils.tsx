import { Copy, Folder } from 'lucide-react'

import { Fragment } from 'react'

import { useStore } from '@/store/create-store'

import { fmtDate } from '../format'
import { groupSlug, MACHINE_GROUPS } from '../selectors'
import { rollformingStore, setCoilsFolder } from '../store'
import { EmptyState } from './bits'

import type { RfCoil } from '../types'

/**
 * The EBMS coil folders, one per machine, each split into size sub-folders by gauge, width and colour.
 *
 * Row `data-comment`s are numbered across the whole view rather than within a sub-folder — the
 * prototype's counter runs straight through, and a comment anchored to `coils-row-4` has to keep
 * meaning the same row.
 */
export const Coils = () => {
  const active = useStore(rollformingStore, state => state.expandedCoilsFolder)
  const coils = useStore(rollformingStore, state => state.coils)

  const rows = coils.filter(coil => coil.group === active)

  const folders = (
    <div className='gtabs' data-comment='coils-folders'>
      {MACHINE_GROUPS.map(group => (
        <button
          key={group}
          className={`gtab ${active === group ? 'active' : ''}`}
          data-comment={`coils-folder-${groupSlug(group)}`}
          onClick={() => setCoilsFolder(group)}
        >
          {group}
        </button>
      ))}
    </div>
  )

  if (!rows.length)
    return (
      <>
        {folders}
        <EmptyState
          title={`No coils in ${active}`}
          text='No EBMS coil Product IDs are folder-tagged to this Machine group.'
        />
      </>
    )

  const bySize: { key: string; coils: RfCoil[] }[] = []
  rows.forEach(coil => {
    const key = `${coil.gauge}|${coil.width}|${coil.color}`
    const existing = bySize.find(group => group.key === key)
    if (existing) existing.coils.push(coil)
    else bySize.push({ key, coils: [coil] })
  })

  let index = 0

  return (
    <>
      {folders}
      {bySize.map(({ key, coils: group }) => {
        const first = group[0] as RfCoil
        const slug = key.replace(/[^a-z0-9]+/gi, '')

        return (
          <Fragment key={key}>
            <div
              className='subhead-title'
              data-comment={`coils-subfolder-${slug}`}
              style={{ margin: '16px 2px 6px' }}
            >
              <Folder
                style={{
                  width: '13px',
                  height: '13px',
                  verticalAlign: '-2px',
                  marginRight: '5px',
                  color: 'var(--text-subtle)'
                }}
              />
              {first.gauge}Ga. {first.width}" {active} · {first.color}{' '}
              <span className='subtle' style={{ fontWeight: 400 }}>
                ({group.length})
              </span>
            </div>

            <div className='table-wrap' data-comment={`coils-wrap-${slug}`}>
              <table className='grid' data-comment={`coils-table-${slug}`}>
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}>ID</th>
                    <th>Description</th>
                    <th style={{ width: '150px' }}>Coil Number</th>
                    <th style={{ width: '120px' }}>Lot Number</th>
                    <th style={{ width: '110px' }}>On Hand</th>
                    <th style={{ width: '110px' }}>Received</th>
                    <th style={{ width: '190px' }}>Note</th>
                  </tr>
                </thead>
                <tbody data-comment={`coils-tbody-${slug}`}>
                  {group.map(coil => {
                    const row = index++

                    return (
                      <tr key={coil.id} data-comment={`coils-row-${row}`}>
                        <td className='mono' data-comment={`coils-id-${row}`}>
                          {coil.productId}
                        </td>
                        <td className='trunc' data-comment={`coils-desc-${row}`}>
                          {coil.gauge}ga × {coil.width}" Coil {coil.color}
                        </td>
                        <td data-comment={`coils-cn-${row}`}>
                          <span className='mono'>{coil.coilNumber}</span>{' '}
                          <button
                            className='icon-btn'
                            title="Copy Coil Number — paste it into a line item's Coil Number field"
                            data-comment={`coils-copycn-${row}`}
                          >
                            <Copy style={{ width: '14px', height: '14px' }} />
                          </button>
                        </td>
                        <td className='mono' data-comment={`coils-lot-${row}`}>
                          {coil.lotNumber}
                        </td>
                        <td className='mono' data-comment={`coils-onhand-${row}`}>
                          {coil.onHand.toLocaleString()} ln ft
                        </td>
                        <td className='cell-num muted' data-comment={`coils-received-${row}`}>
                          {fmtDate(coil.received)}
                        </td>
                        {/* the note is the coil's own: Trim and the plant-wide Coils page edit the same one */}
                        <td data-comment={`coils-notecell-${row}`}>
                          <input
                            className='coil-note-input'
                            data-comment={`coils-note-${row}`}
                            defaultValue={coil.note ?? ''}
                            placeholder='Add note…'
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Fragment>
        )
      })}
    </>
  )
}
