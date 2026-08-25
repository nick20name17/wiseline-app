import { useState } from 'react'
import { Check, SendHorizontal } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { fmtDate } from '../format'
import { acknowledgeNote, addNote, rollformingStore, TODAY } from '../store'

import type { Note } from '../types'

/** Order notes come from EBMS, line notes from the plant — but both are answerable here. */
export type NoteCtx = { orderId: number; lineId: number | null }

const initials = (author: string) =>
  author
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2)

export const NoteModal = ({ ctx, onClose }: { ctx: NoteCtx | null; onClose: () => void }) => {
  const [draft, setDraft] = useState('')
  // read through the subscription, not `get()`: acknowledging a note has to redraw this list
  const orders = useStore(rollformingStore, state => state.orders)

  const order = ctx ? orders.find(entry => entry.id === ctx.orderId) : null
  const line =
    order && ctx?.lineId != null ? order.lineItems.find(item => item.id === ctx.lineId) : null
  const notes: Note[] = (ctx?.lineId != null ? (line?.notes ?? []) : (order?.notes ?? [])) as Note[]

  const add = () => {
    const body = draft.trim()
    if (!body || !ctx) return

    addNote(ctx, {
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
            ctx?.lineId != null
              ? `Line item notes · ${line?.profile ?? ''}`
              : `Order notes · ${order?.order ?? ''}`
          }
          desc={
            ctx?.lineId != null
              ? 'Manager & Worker shared · local only, never pushed to EBMS.'
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
                      <span className='note-dealt' data-comment={`note-dealt-${index}`}>
                        <Check style={{ width: '14px', height: '14px' }} />
                        Dealt with
                      </span>
                    ) : (
                      <span className='note-actions' data-comment={`note-actions-${index}`}>
                        <button
                          className='note-act ack'
                          data-comment={`note-ack-${index}`}
                          title='Mark dealt with'
                          onClick={() => ctx && acknowledgeNote(ctx, note.id)}
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

        <div className='note-foot' data-comment='note-foot'>
          <textarea
            id='note-input'
            className='note-input'
            data-comment='note-input'
            rows={2}
            placeholder='Add a note… (shared with the Rollforming team)'
            value={draft}
            onChange={event => setDraft(event.target.value)}
          />
          <button className='btn btn-primary' data-comment='note-add' onClick={add}>
            <SendHorizontal style={{ width: '14px', height: '14px' }} />
            Add note
          </button>
        </div>
      </div>
    </Overlay>
  )
}
