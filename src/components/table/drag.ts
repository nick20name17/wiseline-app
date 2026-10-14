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
