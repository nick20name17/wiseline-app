import type { ReactNode } from 'react'

import {
  capUnit,
  DEPARTMENTS,
  locationTypeName,
  warehouseName,
  type SettingsState,
  type SettingsLocation,
  type Priority,
  type Truck,
  type User,
  type Warehouse,
  type LocationType
} from './store'

export const AREAS = [
  { key: 'users', label: 'Users' },
  { key: 'machines', label: 'Machines' },
  { key: 'warehouses', label: 'Warehouses' },
  { key: 'locationTypes', label: 'Location Types' },
  { key: 'locations', label: 'Locations' },
  { key: 'trucks', label: 'Trucks' },
  { key: 'priorities', label: 'Priorities' },
  { key: 'workdays', label: 'Work Days' }
]

export type AreaRow = Warehouse | LocationType | SettingsLocation | Priority | User | Truck

export type Column = {
  key: string
  label: string
  w?: string
  cls?: string
  render?: (row: never, state: SettingsState) => ReactNode
}

export type Field = {
  key: string
  /** A capacity's unit follows the department being picked, so a label may read the draft. */
  label: string | ((draft: Draft) => string)
  type: 'text' | 'number' | 'textarea' | 'color' | 'select' | 'toggle' | 'multiselect'
  required?: boolean
  ph?: string
  showIf?: (draft: Draft) => boolean
  /** A field may fix up the rest of the draft — picking Admin drops its departments (N-155). */
  onChange?: (draft: Draft) => void
  options?: (state: SettingsState, draft: Draft) => { value: string | number; label: string }[]
}

export type Draft = Record<string, unknown>

export type AreaConfig = {
  singular: string
  plural?: string
  deptScoped: boolean
  depts?: string[]
  sort?: (a: never, b: never) => number
  columns: Column[]
  fields: Field[]
  defaults: () => Draft
  validate?: (draft: Draft, editingId: number | null, state: SettingsState) => string | null
}

export const PALETTE = ['#d64545', '#cf6f21', '#b58608', '#0f7a54', '#3b5bdb', '#667085']

const ROLES = ['Admin', 'Manager', 'Worker', 'Shipping Manager', 'Driver']

const nameCell = (row: { name: string }) => <span className='cell-name'>{row.name}</span>

/**
 * Each area is a future route, and its columns are all that differ between them.
 *
 * The prototype drives every table off one config so that adding a settings entity is a config entry
 * rather than a screen; the port keeps that arrangement — the fields and the modal form they feed are
 * the part still to come.
 */
export const CONFIG: Record<string, AreaConfig> = {
  priorities: {
    singular: 'priority',
    plural: 'priorities',
    deptScoped: true,
    sort: (a: Priority, b: Priority) => a.hierarchy - b.hierarchy,
    columns: [
      {
        key: 'color',
        label: 'Colour',
        w: '150px',
        render: (row: Priority) => (
          <span className='swatch'>
            <span className='swatch-dot' style={{ background: row.color }} />
            <span className='mono-cell muted'>{row.color}</span>
          </span>
        )
      },
      { key: 'name', label: 'Name', render: nameCell },
      {
        key: 'hierarchy',
        label: 'Hierarchy',
        w: '120px',
        render: (row: Priority) => <span className='hier'>{row.hierarchy}</span>
      }
    ],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, ph: 'e.g. Now' },
      { key: 'color', label: 'Colour', type: 'color', required: true },
      {
        key: 'hierarchy',
        label: 'Hierarchy number (1 = always top)',
        type: 'number',
        required: true,
        ph: 'e.g. 1'
      }
    ],
    defaults: () => ({ name: '', color: PALETTE[0], hierarchy: 1 })
  },
  warehouses: {
    singular: 'warehouse',
    deptScoped: false,
    columns: [
      { key: 'name', label: 'Name', render: nameCell },
      { key: 'address', label: 'Address', cls: 'trunc muted' },
      { key: 'description', label: 'Description', cls: 'trunc muted' },
      {
        key: 'isDefault',
        label: 'Default',
        w: '90px',
        render: (row: Warehouse) =>
          row.isDefault ? (
            <span className='chip green'>Default</span>
          ) : (
            <span className='subtle'>—</span>
          )
      }
    ],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, ph: 'e.g. Tillsonburg' },
      { key: 'address', label: 'Address', type: 'text', ph: 'e.g. 21 Clearview Dr' },
      { key: 'description', label: 'Description', type: 'textarea', ph: 'e.g. Main plant' },
      { key: 'isDefault', label: 'Default warehouse', type: 'toggle' }
    ],
    defaults: () => ({ name: '', address: '', description: '', isDefault: false })
  },
  locationTypes: {
    singular: 'location type',
    deptScoped: true,
    depts: ['Trim', 'Rollforming', 'Accessories'],
    columns: [
      { key: 'name', label: 'Name', render: nameCell },
      {
        key: 'warehouseId',
        label: 'Warehouse',
        render: (row: LocationType, state) => warehouseName(state, row.warehouseId)
      },
      { key: 'description', label: 'Description', cls: 'trunc muted' }
    ],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, ph: 'e.g. Trim Rack' },
      {
        key: 'warehouseId',
        label: 'Warehouse',
        type: 'select',
        required: true,
        options: state => state.warehouses.map(w => ({ value: w.id, label: w.name }))
      },
      {
        key: 'description',
        label: 'Description',
        type: 'textarea',
        ph: 'e.g. Standing trim racks'
      }
    ],
    defaults: () => ({ name: '', warehouseId: null, description: '' })
  },
  locations: {
    singular: 'location',
    deptScoped: true,
    depts: ['Trim', 'Rollforming', 'Accessories'],
    columns: [
      {
        key: 'name',
        label: 'Name',
        w: '110px',
        render: (row: SettingsLocation) => (
          <span className='mono-cell' style={{ fontWeight: 600 }}>
            {row.name}
          </span>
        )
      },
      {
        key: 'warehouseId',
        label: 'Warehouse',
        render: (row: SettingsLocation, state) => warehouseName(state, row.warehouseId)
      },
      {
        key: 'locationTypeId',
        label: 'Location Type',
        render: (row: SettingsLocation, state) => locationTypeName(state, row.locationTypeId)
      },
      {
        key: 'maxWeight',
        label: 'Max Weight',
        w: '110px',
        render: (row: SettingsLocation) => <span className='mono-cell'>{row.maxWeight} lb</span>
      },
      {
        key: 'multiOrder',
        label: 'Multi Order',
        w: '120px',
        render: (row: SettingsLocation) =>
          row.multiOrder ? (
            <span className='chip blue'>{row.numOrders} orders</span>
          ) : (
            <span className='subtle'>Single</span>
          )
      }
    ],
    fields: [
      { key: 'name', label: 'Name (globally unique)', type: 'text', required: true, ph: 'e.g. 206' },
      {
        key: 'warehouseId',
        label: 'Warehouse',
        type: 'select',
        required: true,
        options: state => state.warehouses.map(w => ({ value: w.id, label: w.name }))
      },
      {
        key: 'locationTypeId',
        label: 'Location Type',
        type: 'select',
        required: true,
        options: (state, draft) =>
          state.locationTypes
            .filter(
              type =>
                type.dept === state.activeDept &&
                (!draft.warehouseId || type.warehouseId === draft.warehouseId)
            )
            .map(type => ({ value: type.id, label: type.name }))
      },
      { key: 'maxWeight', label: 'Max weight (lb)', type: 'number', required: true, ph: 'e.g. 2000' },
      { key: 'multiOrder', label: 'Multi-order location', type: 'toggle' },
      {
        key: 'numOrders',
        label: 'Number of orders',
        type: 'number',
        showIf: draft => !!draft.multiOrder,
        ph: 'e.g. 4'
      },
      { key: 'description', label: 'Description', type: 'textarea', ph: 'e.g. Multi-order bay' }
    ],
    defaults: () => ({
      name: '',
      warehouseId: null,
      locationTypeId: null,
      maxWeight: 1000,
      multiOrder: false,
      numOrders: 1,
      description: ''
    }),
    // a location number is written on the floor, so it has to mean one place across every warehouse
    validate: (draft, editingId, state) => {
      const name = String(draft.name ?? '').trim().toLowerCase()
      const dup = state.locations.some(
        location => location.id !== editingId && location.name.trim().toLowerCase() === name
      )
      return dup ? `Location name must be globally unique — “${draft.name}” already exists.` : null
    }
  },
  users: {
    singular: 'user',
    deptScoped: false,
    columns: [
      { key: 'name', label: 'Name', render: nameCell },
      { key: 'email', label: 'Email', cls: 'trunc muted mono-cell' },
      {
        key: 'role',
        label: 'Role',
        w: '150px',
        render: (row: User) => <span className='chip blue'>{row.role}</span>
      },
      {
        key: 'depts',
        label: 'Departments',
        // N-155: an Admin is global, so it has no department scope to list
        render: (row: User) =>
          row.role === 'Admin' ? (
            <span className='subtle'>All departments</span>
          ) : (
            <span className='chips'>
              {row.depts.map(dept => (
                <span className='chip' key={dept}>
                  {dept}
                </span>
              ))}
            </span>
          )
      }
    ],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, ph: 'e.g. John Enns' },
      { key: 'email', label: 'Email', type: 'text', required: true, ph: 'e.g. john@wiseline.app' },
      {
        key: 'role',
        label: 'Role',
        type: 'select',
        required: true,
        options: () => ROLES.map(role => ({ value: role, label: role })),
        onChange: draft => {
          if (draft.role === 'Admin') draft.depts = []
        }
      },
      {
        key: 'depts',
        label: 'Departments',
        type: 'multiselect',
        showIf: draft => draft.role !== 'Admin',
        options: () => DEPARTMENTS.map(dept => ({ value: dept, label: dept }))
      }
    ],
    defaults: () => ({ name: '', email: '', role: 'Worker', depts: [] })
  },
  trucks: {
    singular: 'truck',
    deptScoped: false,
    columns: [
      { key: 'name', label: 'Name', render: nameCell },
      {
        key: 'plate',
        label: 'Plate',
        render: (row: Truck) => <span className='mono-cell'>{row.plate}</span>
      },
      {
        key: 'maxWeight',
        label: 'Max Weight',
        render: (row: Truck) => <span className='mono-cell'>{row.maxWeight} lb</span>
      }
    ],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, ph: 'e.g. Unit 12' },
      { key: 'plate', label: 'Plate', type: 'text', ph: 'e.g. AK-2231' },
      { key: 'maxWeight', label: 'Max weight (lb)', type: 'number', required: true, ph: 'e.g. 18000' }
    ],
    defaults: () => ({ name: '', plate: '', maxWeight: 15000 })
  },
  machines: {
    singular: 'machine',
    deptScoped: false,
    columns: [],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, ph: 'e.g. Slinet' },
      {
        key: 'dept',
        label: 'Department',
        type: 'select',
        required: true,
        options: () => DEPARTMENTS.map(dept => ({ value: dept, label: dept }))
      },
      {
        key: 'dailyMax',
        label: draft => `Daily capacity (${capUnit(String(draft.dept ?? ''))} / day)`,
        type: 'number',
        required: true,
        ph: 'e.g. 220'
      }
    ],
    defaults: () => ({ name: '', dept: 'Trim', dailyMax: 220 })
  }
}
