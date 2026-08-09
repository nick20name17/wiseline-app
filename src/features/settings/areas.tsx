import { useState } from 'react'
import {
  Calendar,
  ChevronDown,
  Database,
  Gauge,
  GripVertical,
  Package,
  Pencil,
  Plus,
  Trash2
} from 'lucide-react'

import { CONFIG, type AreaRow } from './config'
import {
  capUnit,
  deleteRow,
  DEPARTMENTS,
  DOW_ABBR,
  DOW_LABELS,
  fmtHoliday,
  MON_ABBR,
  removeHoliday,
  reorderPriority,
  setDept,
  toggleWorkDay,
  type Machine,
  type SettingsState
} from './store'

const RowActions = ({ area, id }: { area: Parameters<typeof deleteRow>[0]; id: number }) => (
  <div className='row-actions'>
    <button className='icon-btn' data-comment={`area-edit-${id}`} title='Edit'>
      <Pencil style={{ width: '14px', height: '14px' }} />
    </button>
    <button
      className='icon-btn danger'
      data-comment={`area-del-${id}`}
      title='Delete'
      onClick={() => deleteRow(area, id)}
    >
      <Trash2 style={{ width: '14px', height: '14px' }} />
    </button>
  </div>
)

/**
 * Every settings entity except machines and work days, from one table.
 *
 * Priorities is the one that carries a rule rather than a shape: hierarchy *is* the row order, so the
 * rows are draggable and a drop renumbers the whole department.
 */
export const AreaTable = ({ state, area }: { state: SettingsState; area: string }) => {
  const [dragId, setDragId] = useState<number | null>(null)
  const [overId, setOverId] = useState<number | null>(null)

  const config = CONFIG[area]!
  const isPri = area === 'priorities'
  const depts = config.depts ?? DEPARTMENTS
  const curDept = depts.includes(state.activeDept) ? state.activeDept : depts[0]!

  let rows = (state[area as keyof SettingsState] as AreaRow[]).slice()
  if (config.deptScoped) rows = rows.filter(row => (row as { dept: string }).dept === curDept)
  if (config.sort) rows.sort(config.sort as (a: AreaRow, b: AreaRow) => number)

  const plural = config.plural ?? `${config.singular}s`

  return (
    <>
      {config.deptScoped ? (
        <div className='subtabs' data-comment='dept-subtabs'>
          {depts.map(dept => (
            <button
              className={`subtab ${curDept === dept ? 'active' : ''}`}
              data-comment={`dept-sub-${dept.replace(/[^a-z]/gi, '')}`}
              onClick={() => setDept(dept)}
              key={dept}
            >
              {dept}
            </button>
          ))}
        </div>
      ) : null}

      <div className='toolbar' data-comment='area-toolbar'>
        <span className='toolbar-info' data-comment='area-count'>
          <b>{rows.length}</b> {rows.length === 1 ? config.singular : plural}
          {config.deptScoped ? ` in ${curDept}` : ''}
        </span>
        {isPri && rows.length ? (
          <span
            className='toolbar-info subtle'
            data-comment='area-pri-hint'
            style={{ fontSize: '11px' }}
          >
            · drag rows to reorder hierarchy
          </span>
        ) : null}
        <div className='toolbar-spacer' />
        <button className='btn btn-primary' data-comment='area-add'>
          <Plus style={{ width: '14px', height: '14px' }} />
          Add {config.singular}
        </button>
      </div>

      {!rows.length ? (
        <div className='table-wrap' data-comment='area-empty-wrap'>
          <div className='empty' data-comment='area-empty'>
            <h3 data-comment='area-empty-title'>No {plural} yet</h3>
            <p data-comment='area-empty-text'>
              Add one to get started{config.deptScoped ? ` for ${state.activeDept}` : ''}.
            </p>
          </div>
        </div>
      ) : (
        <div className='table-wrap' data-comment='area-table-wrap'>
          <table className='grid' data-comment='area-table' data-component='table'>
            <thead>
              <tr>
                {isPri ? <th style={{ width: '34px' }} /> : null}
                {config.columns.map(column => (
                  <th style={column.w ? { width: column.w } : undefined} key={column.key}>
                    {column.label}
                  </th>
                ))}
                <th style={{ width: '88px' }} />
              </tr>
            </thead>
            <tbody data-comment='area-tbody'>
              {rows.map(row => (
                <tr
                  data-comment={`area-row-${row.id}`}
                  className={
                    isPri
                      ? `pri-drag-row${dragId === row.id ? ' dragging' : ''}${overId === row.id ? ' drag-over' : ''}`
                      : undefined
                  }
                  draggable={isPri || undefined}
                  onDragStart={isPri ? () => setDragId(row.id) : undefined}
                  onDragOver={
                    isPri
                      ? event => {
                          event.preventDefault()
                          setOverId(row.id)
                        }
                      : undefined
                  }
                  onDrop={
                    isPri
                      ? event => {
                          event.preventDefault()
                          if (dragId != null) reorderPriority(dragId, row.id)
                          setDragId(null)
                          setOverId(null)
                        }
                      : undefined
                  }
                  onDragEnd={
                    isPri
                      ? () => {
                          setDragId(null)
                          setOverId(null)
                        }
                      : undefined
                  }
                  key={row.id}
                >
                  {isPri ? (
                    <td className='drag-handle' data-comment={`area-drag-${row.id}`}>
                      <GripVertical style={{ width: '14px', height: '14px' }} />
                    </td>
                  ) : null}
                  {config.columns.map(column => (
                    <td
                      className={column.cls ?? ''}
                      data-comment={`area-cell-${column.key}-${row.id}`}
                      key={column.key}
                    >
                      {column.render
                        ? column.render(row as never, state)
                        : String((row as unknown as Record<string, unknown>)[column.key] ?? '')}
                    </td>
                  ))}
                  <td data-comment={`area-act-${row.id}`}>
                    <RowActions area={area as Parameters<typeof deleteRow>[0]} id={row.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

const MachineRow = ({ machine }: { machine: Machine }) => (
  <div className='mrow' data-comment={`mrow-${machine.id}`}>
    <span className='mrow-name' data-comment={`mrow-name-${machine.id}`}>
      {machine.name}
    </span>
    {machine.name === 'Slinet' ? (
      <span className='mrow-badge' data-comment={`mrow-badge-${machine.id}`}>
        gateway
      </span>
    ) : null}
    <span className='toolbar-spacer' />
    <span className='mrow-cap' data-comment={`mrow-cap-${machine.id}`} title='Daily capacity'>
      <Gauge style={{ width: '12px', height: '12px', pointerEvents: 'none' }} />
      {machine.dailyMax != null ? machine.dailyMax : '—'} {capUnit(machine.dept)} / day
    </span>
    <div className='row-actions'>
      <button
        className='icon-btn'
        data-comment={`mrow-edit-${machine.id}`}
        title='Edit'
        aria-label='Edit machine'
      >
        <Pencil style={{ width: '14px', height: '14px', pointerEvents: 'none' }} />
      </button>
      <button
        className='icon-btn danger'
        data-comment={`mrow-del-${machine.id}`}
        title='Delete'
        aria-label='Delete machine'
        onClick={event => {
          event.stopPropagation()
          deleteRow('machines', machine.id)
        }}
      >
        <Trash2 style={{ width: '14px', height: '14px', pointerEvents: 'none' }} />
      </button>
    </div>
  </div>
)

/** Machines are grouped by department, and each group carries that department's package ceiling. */
export const MachinesArea = ({ state }: { state: SettingsState }) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  return (
    <>
      <div className='toolbar' data-comment='mach-toolbar'>
        <span className='toolbar-info' data-comment='mach-count'>
          <b>{state.machines.length}</b> machines across departments
        </span>
        <div className='toolbar-spacer' />
        <button className='btn btn-primary' data-comment='mach-add'>
          <Plus style={{ width: '14px', height: '14px' }} />
          Add machine
        </button>
      </div>

      {['Trim', 'Rollforming', 'Accessories'].map(dept => {
        const list = state.machines.filter(machine => machine.dept === dept)
        const safe = dept.replace(/[^a-z]/gi, '')
        const shut = !!collapsed[dept]

        return (
          <div
            className={`mgroup${shut ? ' collapsed' : ''}`}
            data-comment={`mgroup-${safe}`}
            key={dept}
          >
            <div
              className='mgroup-head'
              data-comment={`mgroup-head-${safe}`}
              onClick={() => setCollapsed(current => ({ ...current, [dept]: !current[dept] }))}
            >
              <span className='mgroup-title' data-comment={`mgroup-title-${safe}`}>
                {dept}
              </span>
              <span className='mgroup-count mono' data-comment={`mgroup-count-${safe}`}>
                {list.length}
              </span>
              <span className='toolbar-spacer' />
              <button
                className='btn btn-sm'
                data-comment={`mgroup-pkgmax-${safe}`}
                title={`Max package weight for ${dept}`}
                onClick={event => event.stopPropagation()}
              >
                <Package style={{ width: '14px', height: '14px', pointerEvents: 'none' }} />
                Max package · {state.pkgMax[dept] ? `${state.pkgMax[dept]} lb` : 'no limit'}
              </button>
              {dept === 'Rollforming' ? (
                <button
                  className='btn btn-sm'
                  data-comment='mgroup-suppliers'
                  onClick={event => event.stopPropagation()}
                >
                  <Database style={{ width: '14px', height: '14px', pointerEvents: 'none' }} />
                  Coil suppliers
                </button>
              ) : null}
              <ChevronDown
                className='mgroup-chevron'
                style={{ width: '16px', height: '16px', pointerEvents: 'none' }}
              />
            </div>
            <div
              className={`mgroup-body${shut ? ' collapsed' : ''}`}
              data-comment={`mgroup-body-${safe}`}
            >
              {!list.length ? (
                <div className='mgroup-empty' data-comment={`mgroup-empty-${safe}`}>
                  No machines yet — <a href='#'>Add one</a>
                </div>
              ) : null}
              {list.map(machine => (
                <MachineRow machine={machine} key={machine.id} />
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}

/** The plant calendar: which weekdays run, and the named days the shop is closed. */
export const WorkDaysArea = ({ state }: { state: SettingsState }) => {
  const [holidayName, setHolidayName] = useState('')

  const workCount = state.workdays.weekdays.filter(Boolean).length
  const holidays = state.workdays.holidays.slice().sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className='wd-wrap' data-comment='wd-wrap'>
      <section className='wd-card' data-comment='wd-week-card'>
        <div className='wd-card-head' data-comment='wd-week-head'>
          <div>
            <div className='wd-card-title' data-comment='wd-week-title'>
              Work week
            </div>
            <div className='wd-card-sub' data-comment='wd-week-sub'>
              Tap a day to include it in the production schedule.
            </div>
          </div>
          <span className='wd-pill-count' data-comment='wd-week-count'>
            {workCount} / 7 days
          </span>
        </div>
        <div className='wd-pills' data-comment='wd-pills'>
          {DOW_ABBR.map((abbr, index) => {
            const on = !!state.workdays.weekdays[index]

            return (
              <button
                className={`wd-pill ${on ? 'on' : ''}`}
                role='switch'
                aria-checked={on}
                aria-label={DOW_LABELS[index]}
                data-comment={`wd-pill-${index}`}
                onClick={() => toggleWorkDay(index)}
                key={abbr}
              >
                {abbr}
              </button>
            )
          })}
        </div>
      </section>

      <section className='wd-card' data-comment='wd-hol-card'>
        <div className='wd-card-head' data-comment='wd-hol-head'>
          <div>
            <div className='wd-card-title' data-comment='wd-hol-title'>
              Holidays
            </div>
            <div className='wd-card-sub' data-comment='wd-hol-sub'>
              Dates the shop is closed — skipped when the schedule rolls forward.
            </div>
          </div>
          <span className='wd-pill-count' data-comment='wd-hol-count'>
            {holidays.length}
          </span>
        </div>
        <div className='wd-hol-form' data-comment='wd-hol-form'>
          <input
            className='input wd-hol-name-input'
            id='wd-hol-name'
            data-comment='wd-hol-name'
            placeholder='Holiday name — e.g. Canada Day'
            value={holidayName}
            onChange={event => setHolidayName(event.target.value)}
          />
          <button className='select-btn wd-hol-datebtn placeholder' data-comment='wd-hol-datebtn'>
            <Calendar style={{ width: '14px', height: '14px', pointerEvents: 'none' }} />
            <span id='wd-hol-datelabel' data-comment='wd-hol-datelabel'>
              Pick a date
            </span>
          </button>
          <button className='btn btn-primary' data-comment='wd-hol-addbtn'>
            <Plus style={{ width: '14px', height: '14px', pointerEvents: 'none' }} />
            Add
          </button>
        </div>
        {!holidays.length ? (
          <div className='wd-hol-empty' data-comment='wd-hol-empty'>
            No holidays yet — name a date the shop is closed and add it above.
          </div>
        ) : (
          <div className='wd-hol-list' data-comment='wd-hol-list'>
            {holidays.map(holiday => (
              <div
                className='wd-hol-row'
                data-comment={`wd-hol-row-${holiday.date}`}
                key={holiday.date}
              >
                <span className='wd-hol-badge' data-comment={`wd-hol-badge-${holiday.date}`}>
                  <span className='wd-hol-badge-mon'>
                    {MON_ABBR[+holiday.date.slice(5, 7) - 1]}
                  </span>
                  <span className='wd-hol-badge-day'>{+holiday.date.slice(8, 10)}</span>
                </span>
                <span className='wd-hol-info' data-comment={`wd-hol-info-${holiday.date}`}>
                  <span className='wd-hol-name-lbl' data-comment={`wd-hol-namelbl-${holiday.date}`}>
                    {holiday.name || 'Holiday'}
                  </span>
                  <span className='wd-hol-when' data-comment={`wd-hol-when-${holiday.date}`}>
                    {fmtHoliday(holiday.date)}
                  </span>
                </span>
                <button
                  className='icon-btn danger'
                  aria-label='Remove holiday'
                  data-comment={`wd-hol-del-${holiday.date}`}
                  onClick={() => removeHoliday(holiday.date)}
                >
                  <Trash2 style={{ width: '14px', height: '14px', pointerEvents: 'none' }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
