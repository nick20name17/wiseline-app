/**
 * What crosses the line between EBMS and the floor, and what never does. Written out rather than
 * read from anywhere: the order is the argument the page makes.
 */
export const IMPORTED = [
  { title: 'Sales Orders', sub: 'Entry and ship date, order number, customer, line items' },
  { title: 'Order Notes', sub: 'Author, timestamp and text; whether it was dealt with is ours' },
  { title: 'Customer info', sub: 'Name and delivery address' },
  { title: 'Product catalog', sub: 'Product IDs, descriptions, widths and weights' },
  { title: 'Coils', sub: 'Lots with their linear feet' }
]

export const WRITTEN_BACK = [
  { title: 'Ship date · ARINV', sub: 'The order’s SHIP_DATE, when Shipping sets or moves it' },
  {
    title: 'Manufactured qty · ARINVDET',
    sub: 'Qty Ordered less Stock, per line, at Order Complete'
  },
  { title: 'Coil linear feet · INLOTS', sub: 'A coil adjustment, or zero when it is depleted' },
  { title: 'Manufacturing batch · INMFG', sub: 'Stock orders and Stock Manufacturing' }
]

export const LOCAL_ONLY = [
  'Width and description edits',
  'Line item notes',
  'Priority',
  'Machine assignment',
  'Stock column',
  'Reviewed toggle',
  'Scheduling',
  'Stock orders',
  'Statuses'
]
