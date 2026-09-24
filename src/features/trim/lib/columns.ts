import type { ColumnTable } from '@/components/table/column-order'

/*
 * The board's movable columns, one declaration per table: the key its order is saved under and the
 * columns in their default order. A table's header and its rows are separate components, and both
 * hand the same declaration to the column-order hooks. Service columns (checkboxes, expanders) are
 * not listed: they stay put. `width` is the `<col>` class.
 */

/**
 * The table as a stock order shows it: a stock order is what puts trims on the shelf, so it takes
 * nothing off it. Saved under the same key, so the columns it keeps stay where they were dragged.
 */
export const withoutStock = (table: ColumnTable): ColumnTable => ({
  ...table,
  columns: table.columns.filter(column => column.key !== 'stock')
})

export const UNSCHEDULED_TABLE: ColumnTable = {
  table: 'unscheduled',
  columns: [
    { key: 'entry', label: 'Entry', width: 'w-40' },
    { key: 'ship', label: 'Ship', width: 'w-40' },
    // Wide enough for a stock order's own number, which runs longer than an invoice, and the split
    // mark beside it.
    { key: 'order', label: 'Order #', width: 'w-48' },
    { key: 'priority', label: 'Priority', width: 'w-44' },
    { key: 'customer', label: 'Customer' },
    // The heading is wider than the dot under it, and it is what sets the width.
    { key: 'notes', label: 'Notes', width: 'w-24' }
  ]
}

export const UNSCHEDULED_LINES_TABLE: ColumnTable = {
  table: 'unscheduled-lines',
  columns: [
    { key: 'qty', label: 'Qty', width: 'w-20' },
    { key: 'pid', label: 'Product ID', width: 'w-32' },
    { key: 'desc', label: 'Description' },
    { key: 'notes', label: 'Notes', width: 'w-20', hideLabel: true }
  ]
}

export const SCHEDULED_TABLE: ColumnTable = {
  table: 'scheduled',
  columns: [
    // Wide enough for a full date: a ship date cut to «Thu, May 9, …» tells nobody when.
    { key: 'ship', label: 'Ship', width: 'w-40' },
    // The production day is a button with a date on it, and the icons that mark the row — past due,
    // stock — sit beside it and need room of their own.
    { key: 'proddate', label: 'Prod. Date', width: 'w-52' },
    { key: 'order', label: 'Order #', width: 'w-36' },
    { key: 'customer', label: 'Customer' },
    { key: 'priority', label: 'Priority', width: 'w-32' },
    { key: 'reviewed', label: 'Reviewed', width: 'w-40' },
    // The widest pill, «In progress» / «Not started», sits whole beside the cell's padding.
    { key: 'status', label: 'Status', width: 'w-40' },
    // Every column holds its own heading: the headings are the widest thing several of them ever
    // carry, and a heading crushed against the next one reads as one word.
    { key: 'trimloc', label: 'Trim Location', width: 'w-36' },
    { key: 'notes', label: 'Notes', width: 'w-24' }
  ]
}

export const SCHEDULED_LINES_TABLE: ColumnTable = {
  table: 'scheduled-lines',
  columns: [
    { key: 'qty', label: 'Qty', width: 'w-16' },
    { key: 'vent', label: 'Vented', width: 'w-28' },
    { key: 'machine', label: 'Machine', width: 'w-32' },
    // A stock order is what puts trims on the shelf, so its lines leave this one out.
    { key: 'stock', label: 'Stock', width: 'w-20' },
    { key: 'status', label: 'Status', width: 'w-40' },
    { key: 'pid', label: 'Product ID', width: 'w-32' },
    { key: 'desc', label: 'Description' },
    { key: 'w', label: 'W"', width: 'w-20' },
    // Room for a four-figure length and its inch mark — «1200"» — whole.
    { key: 'l', label: 'L"', width: 'w-24' },
    { key: 'notes', label: 'Notes', width: 'w-20' }
  ]
}

export const WRAPPING_TABLE: ColumnTable = {
  table: 'wrapping',
  columns: [
    { key: 'order', label: 'Order #', width: 'w-36' },
    { key: 'customer', label: 'Customer', width: 'w-48' },
    { key: 'qty', label: 'Qty', width: 'w-20' },
    { key: 'stock', label: 'Stock', width: 'w-20' },
    { key: 'priority', label: 'Priority', width: 'w-36' },
    { key: 'remfg', label: 'Remfg', width: 'w-24' },
    { key: 'status', label: 'Status', width: 'w-40' },
    { key: 'pid', label: 'ID', width: 'w-36' },
    { key: 'desc', label: 'Description' },
    { key: 'notes', label: 'Notes', width: 'w-24' }
  ]
}

export const WRAP_LINES_TABLE: ColumnTable = {
  table: 'wrap-lines',
  columns: [
    // Description takes what is left, so Wrapping — the column the bench works in — stays on screen.
    { key: 'line', label: 'ID', width: 'w-28' },
    { key: 'desc', label: 'Description' },
    { key: 'length', label: 'Length', width: 'w-20' },
    { key: 'qty', label: 'Qty ordered', width: 'w-24' },
    { key: 'stock', label: 'Stock', width: 'w-16' },
    { key: 'wrapped', label: 'Wrapped', width: 'w-20' },
    { key: 'left', label: 'Left to wrap', width: 'w-24' },
    { key: 'status', label: 'Status', width: 'w-40' },
    { key: 'reman', label: 'Remanufacture', width: 'w-32' },
    { key: 'wrapping', label: 'Wrapping', width: 'w-40' },
    { key: 'notes', label: 'Notes', width: 'w-16' }
  ]
}

export const COIL_GROUPS_TABLE: ColumnTable = {
  table: 'coil-groups',
  columns: [
    { key: 'pid', label: 'Product ID', width: 'w-40' },
    { key: 'color', label: 'Color', width: 'w-40' },
    { key: 'width', label: 'Width (in.)', width: 'w-28' },
    { key: 'count', label: 'Count', width: 'w-24' },
    { key: 'lf', label: 'Total Linear Feet', width: 'w-40' },
    { key: 'weight', label: 'Total Weight (lbs.)' }
  ]
}

export const COMPLETED_TABLE: ColumnTable = {
  table: 'completed',
  columns: [
    { key: 'ship', label: 'Ship Date', width: 'w-44' },
    { key: 'prod', label: 'Production Date', width: 'w-44' },
    { key: 'completed', label: 'Completed Date & Time', width: 'w-60' },
    { key: 'order', label: 'Order #', width: 'w-36' },
    { key: 'customer', label: 'Customer Name' },
    { key: 'location', label: 'Trim Location', width: 'w-44' }
  ]
}

export const COMPLETED_LINES_TABLE: ColumnTable = {
  table: 'completed-lines',
  columns: [
    { key: 'pid', label: 'Product ID' },
    { key: 'desc', label: 'Description' },
    { key: 'qty', label: 'Qty Ordered' },
    // A stock order took nothing off the shelf, so its lines leave this one out.
    { key: 'stock', label: 'Stock Pulled' },
    { key: 'mfg', label: 'Manufactured' },
    { key: 'reman', label: 'Remanufactured' }
  ]
}

export const COMPLETED_PACKAGES_TABLE: ColumnTable = {
  table: 'completed-packages',
  columns: [
    { key: 'name', label: 'Package' },
    { key: 'contents', label: 'Contents' },
    { key: 'location', label: 'Location' }
  ]
}

export const ALLOCATED_STOCK_TABLE: ColumnTable = {
  table: 'allocated-stock',
  columns: [
    // Fixed widths, so the description is what gives when the sheet is narrow — not the quantity,
    // which is what the window is opened for.
    { key: 'color', label: 'Colour', width: 'w-36' },
    { key: 'pid', label: 'Product ID', width: 'w-36' },
    { key: 'desc', label: 'Description' },
    { key: 'qty', label: 'Qty allocated', width: 'w-36' }
  ]
}

export const CUTLIST_COILS_TABLE: ColumnTable = {
  table: 'cutlist-coils',
  columns: [
    { key: 'num', label: 'Coil #' },
    { key: 'pid', label: 'Product ID' },
    { key: 'thick', label: 'Thickness' },
    { key: 'lf', label: 'Linear feet' },
    { key: 'weight', label: 'Weight (lbs.)' },
    { key: 'note', label: 'Note' }
  ]
}

export const CUTLIST_TOTAL_TABLE: ColumnTable = {
  table: 'cutlist-total',
  columns: [
    { key: 'order', label: 'Order' },
    { key: 'customer', label: 'Customer' },
    { key: 'po', label: 'PO#' },
    { key: 'pid', label: 'Product ID' },
    { key: 'desc', label: 'Description' },
    { key: 'qtyord', label: 'Qty ord.' },
    { key: 'stock', label: 'Stock' },
    { key: 'qty', label: 'Qty to mfg' }
  ]
}
