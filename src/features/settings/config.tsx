import type { ReactNode } from 'react'

import {
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

export type AreaConfig = {
  singular: string
  plural?: string
  deptScoped: boolean
  depts?: string[]
  sort?: (a: never, b: never) => number
  columns: Column[]
}

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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
  },
  machines: { singular: 'machine', deptScoped: false, columns: [] }
}
