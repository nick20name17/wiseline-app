import { useState } from 'react'
import { Check, Lock, SendHorizontal } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { acknowledgeNote, accessoriesStore, addLineNote } from '../store'

import type { Note } from '../types'

/** An order's notes came from EBMS; a line item's are this app's own. */
export type NoteCtx = { orderId: number; lineId: number | null }

const initials = (author: string) =>
  author
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2)

/**
 * One thread, two kinds.
 *
 * Order notes are imported from the salesman in EBMS and are read-only here — the acknowledge tick is
 * the only thing that can be done to them, and the footer says so instead of offering a field that
 * would write somewhere it cannot. Line-item notes are the plant's own and take replies.
 */
export const NoteModal = ({ ctx, onClose }: { ctx: NoteCtx | null; onClose: () => void }) => {
  const [draft, setDraft] = useState('')
  // read through the subscription, not `get()`: acknowledging a note has to redraw this list
  const orders = useStore(accessoriesStore, state => state.orders)
  const role = useStore(accessoriesStore, state => state.role)

  const order = ctx ? orders.find(entry => entry.id === ctx.orderId) : null
  const item =
    order && ctx?.lineId != null ? order.items.find(entry => entry.id === ctx.lineId) : null
  const notes: Note[] = ctx?.lineId != null ? (item?.notes ?? []) : (order?.orderNotes ?? [])
  const lineNotes = ctx?.lineId != null

  const add = () => {
    const body = draft.trim()
    if (!body || !ctx || ctx.lineId == null) return
    addLineNote(ctx.orderId, ctx.lineId, body, role === 'worker' ? 'Worker (you)' : 'Manager (you)')
    setDraft('')
  }

  return (
    <Overlay id='overlay-note' comment='overlay-note' open={!!order} onClose={onClose}>
      <div className='modal' data-comment='note-modal' data-component='dialog'>
        <ModalHead
          comment='note-head'
          titleComment='note-title'
          descComment='note-desc'
          title={
            lineNotes
              ? `Line item notes · ${item?.productId ?? ''}`
              : `Order notes · ${order?.orderNumber ?? ''}`
          }
          desc={
            lineNotes
              ? 'Shared Manager/Worker — app-only, never pushed to or from EBMS.'
              : 'Imported from the Salesman in EBMS — read-only source. Acknowledge to clear the red flag.'
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
                    {note.source === 'ebms' ? (
                      <span
                        className='chip'
                        style={{ fontSize: '9.5px', padding: '1px 7px' }}
                        data-comment={`note-source-${index}`}
                        title='Imported from the Salesman in EBMS — read-only'
                      >
                        EBMS
                      </span>
                    ) : null}
                    <span className='note-meta' data-comment={`note-meta-${index}`}>
                      {note.ts}
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
        {lineNotes ? (
          <div className='note-foot' id='note-foot' data-comment='note-foot'>
            <textarea
              id='note-input'
              className='note-input'
              data-comment='note-input'
              rows={2}
              placeholder='Add a note… (shared Manager/Worker)'
              value={draft}
              onChange={event => setDraft(event.target.value)}
            />
            <button className='btn btn-primary' data-comment='note-add' onClick={add}>
              <SendHorizontal style={{ width: '14px', height: '14px' }} />
              Add note
            </button>
          </div>
        ) : (
          <div className='note-foot' id='note-foot-readonly' data-comment='note-foot-readonly'>
            <span
              className='muted'
              data-comment='note-foot-readonly-text'
              style={{
                fontSize: '11.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Lock style={{ width: '14px', height: '14px', flex: 'none' }} />
              Imported from the Salesman in EBMS — read-only, cannot add notes here. Use the
              checkmark above to acknowledge.
            </span>
          </div>
        )}
      </div>
    </Overlay>
  )
}
