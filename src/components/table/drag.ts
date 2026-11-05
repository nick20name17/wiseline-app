import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type UniqueIdentifier
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { SyntheticEvent } from 'react'

/**
 * Whether a press on a row may pick it up. Rows pick up anywhere, as on the original, except from
 * their Edit and Delete buttons, which a slightly moving click or a held finger would otherwise
 * drag. React bubbles events out of portals too, so a press inside a row's dialog must not either.
 */
const startsDrag = ({ currentTarget, target }: SyntheticEvent) =>
  target instanceof Element &&
  currentTarget.contains(target) &&
  !target.closest('button:not([data-grip]), a, input')

export class RowMouseSensor extends MouseSensor {
  static override activators = [
    {
      eventName: 'onMouseDown' as const,
      handler: (...args: Parameters<(typeof MouseSensor.activators)[number]['handler']>) =>
        startsDrag(args[0]) && MouseSensor.activators[0]!.handler(...args)
    }
  ]
}

export class RowTouchSensor extends TouchSensor {
  static override activators = [
    {
      eventName: 'onTouchStart' as const,
      handler: (...args: Parameters<(typeof TouchSensor.activators)[number]['handler']>) =>
        startsDrag(args[0]) && TouchSensor.activators[0]!.handler(...args)
    }
  ]
}

/**
 * How a sortable table is picked up: a small mouse move, a held finger, or Space on the keyboard. The
 * sensors can be swapped for subclasses that refuse some presses, such as a row's own buttons.
 */
export const useDragSensors = ({
  mouse = MouseSensor,
  touch = TouchSensor
}: { mouse?: typeof MouseSensor; touch?: typeof TouchSensor } = {}) =>
  useSensors(
    useSensor(mouse, { activationConstraint: { distance: 4 } }),
    // A finger holds before it drags, so a swipe across the table still scrolls it.
    useSensor(touch, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

type AnnouncementsOptions = {
  /** What the item is called out loud. */
  name: (id: UniqueIdentifier) => string | undefined
  /** Where it stands, as «3 of 6». */
  place: (id: UniqueIdentifier) => string
  /** What the items are, when their names alone would not say — «column». */
  noun?: string
  /** What an item dragged clear of every target is off: «the header», «the list». */
  area: string
}

/** The defaults read out ids; a screen reader user needs the item's name and its place. */
export const dragAnnouncements = ({
  name,
  place,
  noun,
  area
}: AnnouncementsOptions): Announcements => {
  const subject = (id: UniqueIdentifier) => (noun ? `${noun} ${name(id)}` : `${name(id)}`)
  // Starting a sentence, the noun takes the capital; a name is left as it is spelled.
  const Subject = (id: UniqueIdentifier) =>
    noun ? `${noun[0]!.toUpperCase()}${noun.slice(1)} ${name(id)}` : `${name(id)}`

  return {
    onDragStart: ({ active }) => `Picked up ${subject(active.id)}, at ${place(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${Subject(active.id)} moved to ${place(over.id)}.`
        : `${Subject(active.id)} is off ${area}.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${Subject(active.id)} dropped at ${place(over.id)}.`
        : `${Subject(active.id)} dropped back where it was.`,
    onDragCancel: ({ active }) => `Move cancelled; ${subject(active.id)} is back where it was.`
  }
}
