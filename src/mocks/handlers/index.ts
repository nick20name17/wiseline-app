import { authHandlers } from './auth'
import { boardCoilsHandlers } from './board-coils'
import { boardNotesHandlers } from './board-notes'
import { boardOrdersHandlers } from './board-orders'
import { boardProductionHandlers } from './board-production'
import { boardWrappingHandlers } from './board-wrapping'
import { colorsHandlers } from './colors'
import { departmentHandlers } from './departments'
import { ebmsHandlers } from './ebms'
import { holidaysHandlers } from './holidays'
import { locationsHandlers } from './locations'
import { machinesHandlers } from './machines'
import { prioritiesHandlers } from './priorities'
import { rollformingHandlers } from './rollforming'
import { shippingHandlers } from './shipping'
import { trucksHandlers } from './trucks'
import { usersHandlers } from './users'
import { warehousesHandlers } from './warehouses'

export const handlers = [
  ...authHandlers,
  ...departmentHandlers,
  ...usersHandlers,
  ...trucksHandlers,
  ...colorsHandlers,
  ...holidaysHandlers,
  ...locationsHandlers,
  ...machinesHandlers,
  ...prioritiesHandlers,
  ...warehousesHandlers,
  ...boardNotesHandlers,
  ...boardOrdersHandlers,
  ...boardProductionHandlers,
  ...boardWrappingHandlers,
  ...boardCoilsHandlers,
  ...rollformingHandlers,
  ...shippingHandlers,
  ...ebmsHandlers
]
