import { DepartmentPills } from '@/components/department-pills'
import { QueryError } from '@/components/query-error'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { useColumnOrder } from '@/components/table/column-order'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { departmentByCode, inBoardOrder } from '@/lib/departments'
import { formatDate, fromIsoDay, toIsoDay } from '@/lib/days'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { useState } from 'react'
import { departmentsQuery, summaryQuery, type Count, type MachineSummary } from '../api'
import { SUMMARY_TABLE } from '../lib/columns'
import { formatPieces, machineName, type MachineScope } from '../lib/figures'
import type { Period } from '../lib/period'
import { RemakesDialog } from './remakes-dialog'
import { SpoiledPartsDialog } from './spoiled-parts-dialog'

// Shipping runs no machines, so it spoils and remakes nothing.
const MACHINELESS = 'shipping'

const pickerDate = (date: Date) => formatDate(toIsoDay(date))

type FigureProps = {
  value: number
  /** What a screen reader hears for the button, which shows only the number. */
  label: string
  /** Opens the rows behind the number. */
  onOpen: () => void
}

/** A count of the summary; a click on one that is not zero opens what it counts. */
const Figure = ({ value, label, onOpen }: FigureProps) =>
  value ? (
    <Button variant='link' aria-label={label} onClick={onOpen}>
      <span className='font-mono'>{value}</span>
    </Button>
  ) : (
    <span className={value ? 'font-mono' : 'font-mono text-muted-foreground'}>{value}</span>
  )

type ReportsPageProps = {
  department: string | undefined
  period: Period
  onDepartmentChange: (department: string) => void
  onPeriodChange: (period: Period) => void
}

/**
 * The manager's review of a department over a period, per machine (Kevin's notes of 2026-11-02,
 * N15): how often Stock was taken past the release figure — a spoiled part, recorded in the
 * background with nothing for the Worker to enter — and how often a remake was asked for.
 */
export const ReportsPage = ({
  department,
  period,
  onDepartmentChange,
  onPeriodChange
}: ReportsPageProps) => {
  const { data: departments } = useQuery(departmentsQuery)
  const offered = inBoardOrder(departments).filter(entry => entry.code !== MACHINELESS)
  // One department at a time, the first unless the link names another.
  const active = departmentByCode(offered, department) ?? offered[0]
  const { data: summary, isPending, error, refetch } = useQuery(summaryQuery(active?.id, period))
  const columns = useColumnOrder(SUMMARY_TABLE)
  const [spoiled, setSpoiled] = useState<MachineScope | null>(null)
  const [remakes, setRemakes] = useState<MachineScope | null>(null)

  // A day picked past the other end takes that end with it, so the period never runs backwards.
  const pickFrom = (date: Date) => {
    const from = toIsoDay(date)
    onPeriodChange({ from, to: from > period.to ? from : period.to })
  }
  const pickTo = (date: Date) => {
    const to = toIsoDay(date)
    onPeriodChange({ from: to < period.from ? to : period.from, to })
  }

  const cells = (
    name: string,
    counts: { spoiled: Count; remakes: Count },
    openSpoiled: () => void,
    openRemakes: () => void
  ) =>
    columns.cells({
      machine: <TableCell>{name}</TableCell>,
      spoiled: (
        <TableCell>
          <Figure
            value={counts.spoiled.times}
            label={`Spoiled parts on ${name}: ${counts.spoiled.times}`}
            onOpen={openSpoiled}
          />
        </TableCell>
      ),
      spoiledPieces: (
        <TableCell>
          <span className='font-mono'>{formatPieces(counts.spoiled.pieces)}</span>
        </TableCell>
      ),
      remakes: (
        <TableCell>
          <Figure
            value={counts.remakes.times}
            label={`Remakes on ${name}: ${counts.remakes.times}`}
            onOpen={openRemakes}
          />
        </TableCell>
      ),
      remadePieces: (
        <TableCell>
          <span className='font-mono'>{formatPieces(counts.remakes.pieces)}</span>
        </TableCell>
      )
    })

  const machines: MachineSummary[] = summary?.machines ?? []

  return (
    <section className='flex flex-1 flex-col gap-4'>
      <DepartmentPills departments={offered} active={active} onChange={onDepartmentChange} />

      <div className='flex flex-wrap items-end gap-3'>
        <div className='flex flex-col gap-1.5'>
          <Label htmlFor='report-from'>From</Label>
          <DatePicker
            id='report-from'
            value={fromIsoDay(period.from)}
            format={pickerDate}
            onChange={pickFrom}
          />
        </div>
        <div className='flex flex-col gap-1.5'>
          <Label htmlFor='report-to'>To</Label>
          <DatePicker
            id='report-to'
            value={fromIsoDay(period.to)}
            format={pickerDate}
            onChange={pickTo}
          />
        </div>
        <p className='pb-2 text-sm text-muted-foreground'>
          A spoiled part counts on the machine it was taken for; a remake on the line’s machine.
        </p>
      </div>

      {error && !summary ? (
        <QueryError title='The report did not load' error={error} onRetry={() => void refetch()} />
      ) : !isPending && !machines.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <ClipboardList />
            </EmptyMedia>
            <EmptyTitle>Nothing spoiled or remade</EmptyTitle>
            <EmptyDescription>
              {active ? `${active.name} took` : 'Nobody took'} nothing from stock past release and
              asked for no remakes in this period.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
          <Table data-cards className='min-w-3xl table-fixed'>
            <colgroup>{columns.cols}</colgroup>
            <TableHeader>
              <TableRow>{columns.headers}</TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableSkeletonRows />
              ) : (
                machines.map(machine => {
                  const scope = { flowId: machine.flow_id, machine: machine.machine }
                  return (
                    <TableRow key={machine.flow_id ?? 'none'}>
                      {cells(
                        machineName(machine.machine),
                        machine,
                        () => setSpoiled(scope),
                        () => setRemakes(scope)
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
            {summary && machines.length ? (
              <TableFooter>
                <TableRow>
                  {cells(
                    'All machines',
                    summary.totals,
                    () => setSpoiled('every'),
                    () => setRemakes('every')
                  )}
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </div>
      )}

      {active ? (
        <>
          <SpoiledPartsDialog
            departmentId={active.id}
            period={period}
            scope={spoiled}
            onOpenChange={open => !open && setSpoiled(null)}
          />
          <RemakesDialog
            departmentId={active.id}
            period={period}
            scope={remakes}
            onOpenChange={open => !open && setRemakes(null)}
          />
        </>
      ) : null}
    </section>
  )
}
