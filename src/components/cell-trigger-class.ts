import { cn } from 'cn'

/**
 * A select or menu whose table cell is the trigger, as in tablecn: it shows the value bare and is
 * outlined while its list is open; a box and chevron in every row of a column would turn each row into
 * a form field. In a card, where the cell is a labelled field, a finger hits around the value.
 */
export const CELL_TRIGGER = cn(
  'cursor-pointer outline-none after:absolute',
  'max-lg:relative max-lg:rounded-md max-lg:focus-visible:ring-3 max-lg:focus-visible:ring-ring/50 max-md:after:-inset-x-1 max-md:after:-inset-y-2.5',
  'lg:after:inset-0 lg:after:ring-inset lg:focus-visible:after:ring-2 lg:focus-visible:after:ring-ring/50 lg:data-popup-open:after:ring-2 lg:data-popup-open:after:ring-primary'
)
