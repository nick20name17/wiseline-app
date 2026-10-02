import { QueryError } from '@/components/query-error'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Badge } from '@/components/ui/badge'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { today } from '@/lib/days'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { ArrowLeft, ArrowRight, ChevronRight, Inbox, Minus, Search } from 'lucide-react'
import { Fragment, useState } from 'react'
import { ebmsLogsQuery, isFailed, type EbmsLog, type Outcome } from '../api'
import { IMPORTED, LOCAL_ONLY, WRITTEN_BACK } from '../lib/flows'

const SEARCH_DEBOUNCE_MS = 250

const time = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'

const Stat = ({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) => (
  <div className='rounded-lg border border-border bg-card px-4 py-3 shadow-xs'>
    <div className='text-xs text-muted-foreground'>{label}</div>
    <div className={cn('mt-1 font-mono text-2xl font-semibold tabular-nums', tone)}>{value}</div>
  </div>
)

type FlowColumnProps = {
  icon: React.ReactNode
  title: string
  items: { title: string; sub?: string }[]
}

const FlowColumn = ({ icon, title, items }: FlowColumnProps) => (
  <div className='rounded-lg border border-border bg-card shadow-xs'>
    <div className='flex items-center gap-2 border-b border-border px-4 py-2.5 text-sm font-medium'>
      {icon}
      {title}
    </div>
    <ul className='flex flex-col gap-2.5 px-4 py-3 text-sm'>
      {items.map(item => (
        <li key={item.title}>
          <div className={cn(item.sub && 'font-medium')}>{item.title}</div>
          {item.sub ? <div className='text-xs text-muted-foreground'>{item.sub}</div> : null}
        </li>
      ))}
    </ul>
  </div>
)

const pretty = (body: unknown) => {
  if (body === null) return '—'
  if (typeof body !== 'string') return JSON.stringify(body, null, 2)
  try {
    return JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    return body
  }
}

const LogDetail = ({ log }: { log: EbmsLog }) => (
  <div className='grid gap-3 rounded-md bg-muted/40 p-3 text-xs md:grid-cols-2'>
    <div className='min-w-0'>
      <div className='mb-1 font-medium text-muted-foreground'>Sent</div>
      <pre className='overflow-x-auto font-mono whitespace-pre-wrap'>
        {pretty(log.request_body)}
      </pre>
    </div>
    <div className='min-w-0'>
      <div className='mb-1 font-medium text-muted-foreground'>EBMS answered</div>
      <pre className='overflow-x-auto font-mono whitespace-pre-wrap'>
        {log.error ?? pretty(log.response_body)}
      </pre>
    </div>
  </div>
)

/**
 * EBMS integration: what flows between EBMS and the floor, and every call this app made to EBMS,
 * newest first — what was sent, and what EBMS said back.
 */
export const EbmsPage = () => {
  const [outcome, setOutcome] = useState<Outcome | 'all'>('all')
  const [term, setTerm] = useState('')
  const search = useDebouncedValue(term.trim(), SEARCH_DEBOUNCE_MS)
  const [open, setOpen] = useState<number | null>(null)

  const since = today()
  const okToday = useQuery(ebmsLogsQuery({ outcome: 'ok', since, limit: 1 }))
  const failedToday = useQuery(ebmsLogsQuery({ outcome: 'failed', since, limit: 1 }))
  const logs = useQuery(
    ebmsLogsQuery({ outcome: outcome === 'all' ? undefined : outcome, search: search || undefined })
  )
  const rows = logs.data?.results ?? []
  const latest = useQuery(ebmsLogsQuery({ limit: 1 })).data?.results[0]

  return (
    <section className='flex flex-1 flex-col gap-6'>
      <div>
        <h1 className='text-xl font-semibold'>EBMS integration</h1>
        <p className='text-sm text-muted-foreground'>
          How data flows between EBMS and the production floor.
        </p>
      </div>

      <div className='grid gap-3 sm:grid-cols-3'>
        <Stat label='Write-backs today' value={okToday.data?.count ?? '—'} />
        <Stat
          label='Failed today'
          value={failedToday.data?.count ?? '—'}
          tone={failedToday.data?.count ? 'text-destructive' : undefined}
        />
        <Stat label='Last call to EBMS' value={time(latest?.created_at ?? null)} />
      </div>

      <div className='flex flex-col gap-3'>
        <h2 className='font-medium'>Flow overview</h2>
        <div className='grid gap-3 lg:grid-cols-3'>
          <FlowColumn
            icon={<ArrowRight className='size-4 text-primary' />}
            title='EBMS → App · Import (read-only)'
            items={IMPORTED}
          />
          <FlowColumn
            icon={<ArrowLeft className='size-4 text-success' />}
            title='App → EBMS · Write-back'
            items={WRITTEN_BACK}
          />
          <FlowColumn
            icon={<Minus className='size-4 text-muted-foreground' />}
            title='Local only · never synced'
            items={LOCAL_ONLY.map(title => ({ title }))}
          />
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        <div className='flex flex-wrap items-center gap-3'>
          <h2 className='font-medium'>Write-back log</h2>
          <Tabs value={outcome} onValueChange={value => setOutcome(value as Outcome | 'all')}>
            <TabsList>
              <TabsTrigger value='all'>All</TabsTrigger>
              <TabsTrigger value='ok'>Synced</TabsTrigger>
              <TabsTrigger value='failed'>Failed</TabsTrigger>
            </TabsList>
          </Tabs>
          <InputGroup className='ml-auto w-64'>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type='search'
              aria-label='Search the log'
              placeholder='Order, product, coil…'
              value={term}
              onChange={event => setTerm(event.target.value)}
            />
          </InputGroup>
        </div>

        {logs.error ? (
          <QueryError title='The EBMS log did not load' error={logs.error} onRetry={logs.refetch} />
        ) : !logs.isPending && !rows.length ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant='icon'>
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>Nothing in the log</EmptyTitle>
              <EmptyDescription>
                Try a different filter, or check back after the next sync.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
            <Table className='table-fixed'>
              <colgroup>
                <col className='w-10' />
                <col className='w-24' />
                <col className='w-24' />
                <col className='w-32' />
                <col />
                <col className='w-36' />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <span className='sr-only'>Details</span>
                  </TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.isPending ? (
                  <TableSkeletonRows columns={6} />
                ) : (
                  rows.map(log => {
                    const failed = isFailed(log)
                    const expanded = open === log.id
                    return (
                      <Fragment key={log.id}>
                        <TableRow>
                          <TableCell>
                            <button
                              type='button'
                              aria-expanded={expanded}
                              aria-label={expanded ? 'Hide the call' : 'Show the call'}
                              className='grid size-6 place-items-center rounded-md hover:bg-muted'
                              onClick={() => setOpen(expanded ? null : log.id)}
                            >
                              <ChevronRight
                                className={cn(
                                  'size-4 transition-transform',
                                  expanded && 'rotate-90'
                                )}
                              />
                            </button>
                          </TableCell>
                          <TableCell>
                            <span className='font-mono'>{time(log.created_at)}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant='outline'>{log.method}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className='font-mono'>{log.entity ?? '—'}</span>
                          </TableCell>
                          <TableCell>
                            <span className='block truncate font-mono text-muted-foreground'>
                              {log.url}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={failed ? 'destructive' : 'soft'}>
                              {failed ? 'Failed' : 'Synced'}
                            </Badge>
                            <span className='ml-2 font-mono text-xs text-muted-foreground'>
                              {log.status_code ?? 'no answer'}
                            </span>
                          </TableCell>
                        </TableRow>
                        {expanded ? (
                          <TableRow>
                            <TableCell colSpan={6}>
                              <LogDetail log={log} />
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  )
}
