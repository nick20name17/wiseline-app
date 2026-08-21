import { useState } from 'react'
import { Check, Lock, SendHorizontal, X } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { fmtDate } from '../format'
import { addLineNote, setNoteDealt, TODAY, trimStore } from '../store'

import type { Note } from '../types'

/** An order's notes come from EBMS; a line's belong to this app. The two are read very differently. */
export type NoteCtx = { orderId: number; lineId: number | null }

const initials = (author: string) =>
  author
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2)

/**
 * Notes on an order, or on one of its line items.
 *
 * The difference is the whole modal: order notes are imported from the salesman in EBMS, so they are
 * read-only here and can only be acknowledged — there is no composer, because a reply typed here would
 * never reach the person who wrote it. Line notes are the app's own and are fully editable.
 *
 * A new note stays unread until someone acknowledges it, which is what the red dot on the board counts.
 */
export const NoteModal = ({ ctx, onClose }: { ctx: NoteCtx | null; onClose: () => void }) => {
  const [draft, setDraft] = useState('')
  // read through the subscription, not `get()`: acknowledging a note has to redraw this list
  const orders = useStore(trimStore, state => state.orders)

  const order = ctx ? orders.find(entry => entry.id === ctx.orderId) : null
  const line =
    order && ctx?.lineId != null ? order.lineItems.find(item => item.id === ctx.lineId) : null
  const notes: Note[] = (ctx?.lineId != null ? (line?.notes ?? []) : (order?.notes ?? [])) as Note[]
  const editable = ctx?.lineId != null

  const add = () => {
    const body = draft.trim()
    if (!body || !ctx || ctx.lineId == null) return

    addLineNote(ctx.orderId, ctx.lineId, {
      id: Date.now(),
      author: 'You',
      email: 'you@wiseline.app',
      ts: `${fmtDate(TODAY)}, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      body,
      dealt: false
    })
    setDraft('')
  }

  return (
    <Overlay id='overlay-note' comment='overlay-note' open={!!ctx} onClose={onClose}>
      <div className='modal' data-comment='note-modal' data-component='dialog'>
        <ModalHead
          comment='note-head'
          titleComment='note-title'
          descComment='note-desc'
          title={
            editable
              ? `Line notes · ${line?.productId ?? ''}`
              : `Order notes · ${order?.order ?? ''}`
          }
          desc={
            editable
              ? 'Shared TM/TW · local only, never pushed to EBMS (N-023).'
              : 'Imported from the salesman in EBMS.'
          }
          onClose={onClose}
        />

        <div
          className='modal-body'
          id='note-body'
          data-comment='note-body'
          style={{ paddingBottom: '8px' }}
        >
          {!notes.length ? (
            <div className='empty' data-comment='note-empty' style={{ padding: '36px 12px' }}>
              <p data-comment='note-empty-text'>No notes yet.</p>
            </div>
          ) : (
            notes.map((note, index) => (
              <div className='note-item' data-comment={`note-item-${index}`} key={note.id}>
                <div className='note-avatar' data-comment={`note-avatar-${index}`}>
                  {initials(note.author)}
                </div>
                <div className='note-main' data-comment={`note-main-${index}`}>
                  <div className='note-headrow' data-comment={`note-headrow-${index}`}>
                    {note.dealt ? null : (
                      <span className='note-unread' data-comment={`note-unread-${index}`} />
                    )}
                    <span className='note-author' data-comment={`note-author-${index}`}>
                      {note.author}
                    </span>
                    <span className='note-meta' data-comment={`note-meta-${index}`}>
                      {note.email} · {note.ts}
                    </span>
                    {note.dealt ? (
                      <button
                        className='note-dealt'
                        data-comment={`note-dealt-${index}`}
                        title='Undo — mark as not dealt with'
                        onClick={() => ctx && setNoteDealt(ctx, note.id, false)}
                      >
                        <Check style={{ width: '14px', height: '14px' }} />
                        Dealt with
                      </button>
                    ) : (
                      <span className='note-actions' data-comment={`note-actions-${index}`}>
                        <button
                          className='note-act dismiss'
                          data-comment={`note-dismiss-${index}`}
                          title='Leave unread'
                          onClick={onClose}
                        >
                          <X style={{ width: '14px', height: '14px' }} />
                        </button>
                        <button
                          className='note-act ack'
                          data-comment={`note-ack-${index}`}
                          title='Mark dealt with'
                          onClick={() => ctx && setNoteDealt(ctx, note.id, true)}
                        >
                          <Check style={{ width: '14px', height: '14px' }} />
                        </button>
                      </span>
                    )}
                  </div>
                  <div className='note-body' data-comment={`note-text-${index}`}>
                    {note.body}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div
          className='note-foot'
          id='note-foot'
          data-comment='note-foot'
          style={{ display: editable ? 'flex' : 'none' }}
        >
          <textarea
            id='note-input'
            className='note-input'
            data-comment='note-input'
            rows={2}
            placeholder='Add a note… (shared with the Trim team)'
            value={draft}
            onChange={event => setDraft(event.target.value)}
          />
          <button className='btn btn-primary' data-comment='note-add' onClick={add}>
            <SendHorizontal style={{ width: '14px', height: '14px' }} />
            Add note
          </button>
        </div>

        <div
          className='note-foot'
          id='note-foot-readonly'
          data-comment='note-foot-readonly'
          style={{ display: editable ? 'none' : 'flex' }}
        >
          <span
            className='muted'
            data-comment='note-foot-readonly-text'
            style={{ fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Lock style={{ width: '14px', height: '14px', flex: 'none' }} />
            Imported from the Salesman in EBMS — read-only, cannot add notes here. Use the checkmark
            above to acknowledge.
          </span>
        </div>
      </div>
    </Overlay>
  )
}
