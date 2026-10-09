/**
 * A shipping status — a Load's, an order's p3 (592,489)-(592,574), or a line's on the boards — as the
 * board words it: `not_started` reads «Not Started».
 */
export const statusLabel = (status: string | null) =>
  status
    ? status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : null
