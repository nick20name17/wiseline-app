import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'
import { usePopover } from '@/components/shell/pop'

import { PROFILE_INFO, priorityById, supplierName } from '../selectors'
import { createMaterialRequest, rollformingStore } from '../store'
import { showToast } from '../ui'

type Form = {
  profile: string
  gauge: string
  thickness: string
  color: string
  width: string
  linearFeet: string
  priorityId: number | null
  supplierId: number | null
  rollMaterial: boolean
}

const BLANK: Form = {
  profile: '',
  gauge: '',
  thickness: '',
  color: '',
  width: '',
  linearFeet: '',
  priorityId: null,
  supplierId: null,
  rollMaterial: false
}

const FIELDS: {
  key: 'gauge' | 'thickness' | 'color' | 'width' | 'linearFeet'
  label: string
  comment: string
  placeholder: string
}[] = [
  { key: 'gauge', label: 'Gauge', comment: 'gauge', placeholder: '26' },
  { key: 'thickness', label: 'Thickness', comment: 'thickness', placeholder: '0.0180' },
  { key: 'color', label: 'Colour', comment: 'color', placeholder: 'Charcoal' },
  { key: 'width', label: 'Width', comment: 'width', placeholder: '40.075' },
  { key: 'linearFeet', label: 'Linear Feet', comment: 'lf', placeholder: '1800' }
]

const label = (text: string, comment: string) => (
  <label
    className='subhead-title'
    data-comment={`mreq-l-${comment}`}
    style={{ display: 'block', marginBottom: '5px' }}
  >
    {text}
  </label>
)

/** The raw-coil request a machine raises for itself — no customer, no ship date, and never split. */
export const MaterialRequestModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [form, setForm] = useState<Form>(BLANK)
  const priorities = useStore(rollformingStore, state => state.priorities)
  const suppliers = useStore(rollformingStore, state => state.suppliers)
  const { openPop, popNode } = usePopover()

  const priority = priorityById(form.priorityId, priorities)

  const submit = () => {
    if (!form.profile || !form.gauge || !form.color)
      return showToast('Profile, Gauge and Colour are required')

    const number = createMaterialRequest(form)
    setForm(BLANK)
    onClose()
    showToast(`Material request ${number} created`)
  }

  return (
    <Overlay id='overlay-mreq' comment='overlay-mreq' open={open} onClose={onClose}>
      <div className='modal' data-comment='mreq-modal' data-component='dialog'>
        <ModalHead
          comment='mreq-head'
          titleComment='mreq-title'
          descComment='mreq-desc'
          title='New Material Request'
          desc='Raw coil request from a Rollforming Machine — no Split Order option, Requested By = Material Request from Rollformer.'
          onClose={onClose}
        />
        <div className='modal-body' id='mreq-body' data-comment='mreq-body'>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>
            <div data-comment='mreq-f-profile'>
              {label('Profile', 'profile')}
              <button
                className={`field-btn ${form.profile ? '' : 'is-empty'}`}
                data-pop-anchor
                data-comment='mreq-profile-btn'
                style={{ width: '100%' }}
                onClick={event => {
                  event.stopPropagation()
                  openPop<string>(
                    event.currentTarget,
                    Object.keys(PROFILE_INFO).map(profile => ({ label: profile, value: profile })),
                    profile => setForm(current => ({ ...current, profile })),
                    form.profile
                  )
                }}
              >
                {form.profile || 'Select profile'}
                <ChevronDown />
              </button>
            </div>

            <div data-comment='mreq-f-priority'>
              {label('Priority', 'priority')}
              <button
                className={`field-btn ${priority ? '' : 'is-empty'}`}
                data-pop-anchor
                data-comment='mreq-priority-btn'
                style={{ width: '100%' }}
                onClick={event => {
                  event.stopPropagation()
                  openPop<number>(
                    event.currentTarget,
                    [
                      ...priorities.map(entry => ({ label: entry.name, value: entry.id })),
                      { label: 'No priority', value: 0 }
                    ],
                    value => setForm(current => ({ ...current, priorityId: value || null })),
                    form.priorityId ?? 0
                  )
                }}
              >
                {priority ? priority.name : 'No priority'}
                <ChevronDown />
              </button>
            </div>

            {FIELDS.map(field => (
              <div data-comment={`mreq-f-${field.comment}`} key={field.key}>
                {label(field.label, field.comment)}
                <input
                  className='field-input'
                  data-comment={`mreq-${field.comment}-input`}
                  style={{ width: '100%' }}
                  value={form[field.key]}
                  placeholder={field.placeholder}
                  onChange={event =>
                    setForm(current => ({ ...current, [field.key]: event.target.value }))
                  }
                />
              </div>
            ))}

            <div data-comment='mreq-f-supplier'>
              {label('Supplier Coil', 'supplier')}
              <button
                className='field-btn'
                data-pop-anchor
                data-comment='mreq-supplier-btn'
                style={{ width: '100%' }}
                onClick={event => {
                  event.stopPropagation()
                  openPop<number>(
                    event.currentTarget,
                    [
                      { label: 'Undefined', value: 0 },
                      ...suppliers.map(entry => ({ label: entry.name, value: entry.id }))
                    ],
                    value => setForm(current => ({ ...current, supplierId: value || null })),
                    form.supplierId ?? 0
                  )
                }}
              >
                {form.supplierId ? supplierName(form.supplierId, suppliers) : 'Undefined'}
                <ChevronDown />
              </button>
            </div>
          </div>

          <label
            className='switch-wrap'
            data-comment='mreq-f-rollmaterial'
            style={{ marginTop: '14px', cursor: 'pointer' }}
          >
            <input
              type='checkbox'
              className='chk'
              data-comment='mreq-rollmaterial-chk'
              checked={form.rollMaterial}
              onChange={() =>
                setForm(current => ({ ...current, rollMaterial: !current.rollMaterial }))
              }
            />
            <span
              className='switch-hint'
              data-comment='mreq-rollmaterial-label'
              style={{ fontSize: '12.5px', color: 'var(--text)' }}
            >
              Roll Material{' '}
              <span className='subtle'>
                (EBMS line-item flag — roll this coil rather than pull finished stock)
              </span>
            </span>
          </label>
        </div>
        <div className='modal-foot' data-comment='mreq-foot'>
          <button className='btn btn-ghost' data-comment='mreq-cancel' onClick={onClose}>
            Cancel
          </button>
          <button className='btn btn-primary' data-comment='mreq-submit' onClick={submit}>
            Create request
          </button>
        </div>
      </div>
      {popNode}
    </Overlay>
  )
}
