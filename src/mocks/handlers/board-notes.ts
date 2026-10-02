import { http, HttpResponse } from 'msw'
import { now } from '../lib/dates'
import { bodyOf, notFound } from '../lib/http'
import { ensureItem, lineById, lineNotes, nextCounter, orderNotes } from '../lib/world'
import { users } from '../seed/users'
import { api } from '../url'

const signedIn = users[0]

const authorOf = (id: number) => {
  const user = users.find(row => row.id === id) ?? signedIn
  return {
    name: `${user?.first_name} ${user?.last_name}`,
    email: user?.email ?? null,
    initials: `${user?.first_name[0] ?? ''}${user?.last_name[0] ?? ''}`
  }
}

const orderNoteOf = (id: string) => {
  const note = orderNotes.get(id)
  if (!note) return { has_note: false }
  return {
    has_note: true,
    text: note.text,
    author: note.author,
    created_at: note.created_at,
    read: note.read_at !== null,
    read_at: note.read_at
  }
}

const threadOf = (originItem: string) => lineNotes.filter(note => note.item === originItem)

/** Order and line-item notes, read by both the boards and Shipping. */
export const boardNotesHandlers = [
  http.post(api('orders/notes/'), async ({ request }) => {
    const { orders } = await bodyOf<{ orders: string[] }>(request)
    return HttpResponse.json(Object.fromEntries(orders.map(id => [id, orderNoteOf(id)])))
  }),

  http.post(api('orders/:order/note/:state/'), ({ params }) => {
    const note = orderNotes.get(String(params.order))
    if (!note) return notFound()
    note.read_at = params.state === 'read' ? now() : null
    return HttpResponse.json(orderNoteOf(String(params.order)))
  }),

  http.post(api('items/notes/'), async ({ request }) => {
    const { origin_items } = await bodyOf<{ origin_items: string[] }>(request)
    return HttpResponse.json(
      Object.fromEntries(
        origin_items.map(id => {
          const thread = threadOf(id)
          return [
            id,
            {
              count: thread.length,
              unread: thread.filter(note => !note.read).length,
              has_notes: thread.length > 0
            }
          ]
        })
      )
    )
  }),

  http.get(api('items/:originItem/notes/'), ({ params }) => {
    const line = lineById(String(params.originItem))
    // No row of our own for the line means no thread: the client reads the 404 as empty.
    if (!line?.item) return notFound()
    const thread = threadOf(line.id)
    return HttpResponse.json({
      notes: thread.map(note => ({
        id: note.id,
        text: note.text,
        author: authorOf(note.author),
        created_at: note.created_at,
        read: note.read
      })),
      unread: thread.some(note => !note.read),
      count: thread.length
    })
  }),

  http.post(api('comments/'), async ({ request }) => {
    const { item, text } = await bodyOf<{ item: string; text: string }>(request)
    const line = lineById(item)
    if (!line) return notFound()
    ensureItem(line)
    const note = {
      id: nextCounter('note'),
      item,
      text,
      author: signedIn?.id ?? 1,
      created_at: now(),
      // The author has read what they just wrote.
      read: true
    }
    lineNotes.push(note)
    return HttpResponse.json({ ...note, author: authorOf(note.author) }, { status: 201 })
  }),

  http.post(api('notes/:id/:state/'), ({ params }) => {
    const note = lineNotes.find(row => row.id === Number(params.id))
    if (!note) return notFound()
    note.read = params.state === 'read'
    return HttpResponse.json({ id: note.id, read: note.read })
  })
]
