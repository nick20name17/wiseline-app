import type { ColumnTable } from '@/components/table/column-order'

export const SUMMARY_TABLE: ColumnTable = {
  table: 'reports-summary',
  columns: [
    { key: 'machine', label: 'Machine', align: 'start', card: 'title' },
    { key: 'spoiled', label: 'Spoiled', width: 'w-32' },
    { key: 'spoiledPieces', label: 'Spoiled pieces', width: 'w-36' },
    { key: 'remakes', label: 'Remakes', width: 'w-32' },
    { key: 'remadePieces', label: 'Remade pieces', width: 'w-36' }
  ]
}

export const SPOILED_TABLE: ColumnTable = {
  table: 'reports-spoiled',
  columns: [
    { key: 'when', label: 'When', width: 'w-44', align: 'start' },
    { key: 'order', label: 'Order', width: 'w-24' },
    { key: 'description', label: 'Description', align: 'start', card: 'full' },
    { key: 'machine', label: 'Machine', width: 'w-32' },
    { key: 'release', label: 'Stock at release', width: 'w-32' },
    { key: 'stock', label: 'Stock', width: 'w-24' },
    { key: 'spoiled', label: 'Spoiled', width: 'w-24' }
  ]
}

export const REMAKES_TABLE: ColumnTable = {
  table: 'reports-remakes',
  columns: [
    { key: 'when', label: 'When', width: 'w-44', align: 'start' },
    { key: 'by', label: 'Asked by', width: 'w-36' },
    { key: 'source', label: 'From', width: 'w-28' },
    { key: 'pieces', label: 'Pieces', width: 'w-24' },
    { key: 'status', label: 'Status', width: 'w-36' },
    { key: 'note', label: 'Note', align: 'start', card: 'full' }
  ]
}
