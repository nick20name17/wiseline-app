const STATUS_LABEL: Record<string, string> = {
  unreleased: 'Unreleased',
  not_started: 'Not Started',
  loading: 'Loading',
  loaded: 'Loaded',
  en_route: 'En Route',
  delivered: 'Delivered',
  completed: 'Completed'
}

/** A Load's or an order's shipping status as the board words it p3 (592,489)-(592,574). */
export const statusLabel = (status: string | null) =>
  status ? (STATUS_LABEL[status] ?? status) : null
