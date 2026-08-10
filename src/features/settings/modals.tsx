import { useState } from 'react'
import { Check, ChevronDown, Trash2 } from 'lucide-react'

import { ModalHead, Overlay } from '@/components/shell/modal'
import { NumberInput } from '@/components/shell/number-input'
import { usePopover } from '@/components/shell/pop'

import { CONFIG, PALETTE, type Draft, type Field } from './config'
import { addRow, saveRow, setPkgMax, setSuppliers, type SettingsState } from './store'

const labelOf = (field: Field, draft: Draft) =>
  typeof field.label === 'function' ? field.label(draft) : field.label

/**
 * One form for every settings entity, driven by the same config the tables are.
 *
 * Required is checked against the fields that are actually showing — a hidden field cannot be filled
 * in, so demanding it would be a dead end — and an area may add a rule of its own, which is how a
 * location name stays unique across every warehouse.
 */
export const FormModal = ({
  open,
  area,
  editingId,
  state,
  onClose,
  onSaved
}: {
  open: boolean
  area: string
  editingId: number | null
  state: SettingsState
  onClose: () => void
  onSaved: (message: string) => void
}) => {
  // Machines and Work Days have no form of their own; a closed overlay still has to render something
  const config = CONFIG[area] ?? CONFIG.users!
  const existing = editingId
    ? (state[area as keyof SettingsState] as { id: number }[]).find(row => row.id === editingId)
    : null

  const [draft, setDraft] = useState<Draft>(() =>
    existing ? { ...(existing as Draft) } : config.defaults()
  )
  const [error, setError] = useState('')
  const { openPop, popNode } = usePopover()

  const patch = (key: string, value: unknown) =>
    setDraft(current => {
      const next = { ...current, [key]: value }
      config.fields.find(field => field.key === key)?.onChange?.(next)
      return next
    })

  const submit = () => {
    for (const field of config.fields) {
      if (!field.required || (field.showIf && !field.showIf(draft))) continue

      const value = draft[field.key]
      if (value === '' || value == null || (typeof value === 'string' && !value.trim()))
        return setError(`“${labelOf(field, draft)}” is required.`)
    }

    const failure = config.validate?.(draft, editingId, state)
    if (failure) return setError(failure)

    if (editingId) {
      saveRow(area, editingId, draft)
      onSaved('Saved changes')
    } else {
      addRow(area, config.deptScoped ? { ...draft, dept: state.activeDept } : draft)
      onSaved(`${config.singular[0]!.toUpperCase()}${config.singular.slice(1)} added`)
    }
    onClose()
  }

  return (
    <Overlay id='overlay-form' comment='overlay-form' open={open} onClose={onClose}>
      <div className='modal' data-comment='form-modal' data-component='dialog'>
        <ModalHead
          comment='form-head'
          titleComment='form-title'
          descComment='form-desc'
          title={`${editingId ? 'Edit ' : 'Add '}${config.singular}`}
          desc={config.deptScoped ? `Department: ${state.activeDept}` : ''}
          onClose={onClose}
        />
        <div className='modal-body' id='form-body' data-comment='form-body'>
          <div
            className='form-error'
            id='form-error'
            data-comment='form-error'
            style={{ display: error ? 'block' : 'none' }}
          >
            {error}
          </div>

          {config.fields.map(field => {
            if (field.showIf && !field.showIf(draft)) return null

            const comment = `form-field-${field.key}`
            const value = draft[field.key]

            if (field.type === 'toggle')
              return (
                <div className='field' data-comment={comment} key={field.key}>
                  <div className='toggle-row'>
                    <label className='field-label' data-comment={`${comment}-label`}>
                      {labelOf(field, draft)}
                    </label>
                    <button
                      className={`switch ${value ? 'on' : ''}`}
                      data-comment={`${comment}-switch`}
                      onClick={() => patch(field.key, !value)}
                    />
                  </div>
                </div>
              )

            const options = field.options?.(state, draft) ?? []
            const current = options.find(option => option.value === value)

            return (
              <div className='field' data-comment={comment} key={field.key}>
                <label className='field-label' data-comment={`${comment}-label`}>
                  {labelOf(field, draft)}
                  {field.required ? <span className='req'>*</span> : null}
                </label>

                {field.type === 'text' ? (
                  <input
                    className='input'
                    data-comment={`${comment}-input`}
                    placeholder={field.ph ?? ''}
                    value={String(value ?? '')}
                    onChange={event => patch(field.key, event.target.value)}
                  />
                ) : null}

                {field.type === 'number' ? (
                  <NumberInput
                    comment={`${comment}-input`}
                    placeholder={field.ph ?? ''}
                    value={String(value ?? '')}
                    onValueChange={next => patch(field.key, next === '' ? 0 : Number(next))}
                  />
                ) : null}

                {field.type === 'textarea' ? (
                  <textarea
                    className='textarea'
                    data-comment={`${comment}-input`}
                    placeholder={field.ph ?? ''}
                    value={String(value ?? '')}
                    onChange={event => patch(field.key, event.target.value)}
                  />
                ) : null}

                {field.type === 'color' ? (
                  <div className='palette' data-comment={`${comment}-palette`}>
                    {PALETTE.map((colour, index) => (
                      <button
                        className={`swatch-btn ${value === colour ? 'sel' : ''}`}
                        data-comment={`${comment}-sw-${index}`}
                        style={{ background: colour }}
                        onClick={() => patch(field.key, colour)}
                        key={colour}
                      />
                    ))}
                  </div>
                ) : null}

                {field.type === 'select' ? (
                  <button
                    className={`select-btn ${current ? '' : 'placeholder'}`}
                    data-pop-anchor
                    data-comment={`${comment}-select`}
                    onClick={event => {
                      event.stopPropagation()
                      openPop(
                        event.currentTarget,
                        options,
                        picked => patch(field.key, picked),
                        value as string | number
                      )
                    }}
                  >
                    {current ? current.label : 'Select…'}
                    <ChevronDown style={{ width: '14px', height: '14px' }} />
                  </button>
                ) : null}

                {field.type === 'multiselect' ? (
                  <div className='checklist' data-comment={`${comment}-checklist`}>
                    {options.map((option, index) => {
                      const on = ((value as string[]) ?? []).includes(String(option.value))

                      return (
                        <button
                          className={`check-pill ${on ? 'on' : ''}`}
                          data-comment={`${comment}-opt-${index}`}
                          onClick={() => {
                            const list = ((value as string[]) ?? []).slice()
                            patch(
                              field.key,
                              on
                                ? list.filter(entry => entry !== option.value)
                                : [...list, String(option.value)]
                            )
                          }}
                          key={option.value}
                        >
                          {on ? <Check style={{ width: '14px', height: '14px' }} /> : null}
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
        <div className='modal-foot' data-comment='form-foot'>
          <button className='btn btn-ghost' data-comment='form-cancel' onClick={onClose}>
            Cancel
          </button>
          <button
            className='btn btn-primary'
            id='form-save'
            data-comment='form-save'
            onClick={submit}
          >
            Save
          </button>
        </div>
      </div>
      {popNode}
    </Overlay>
  )
}

/** Rollforming's coil suppliers: a plain list, added to and removed from in place. */
export const SuppliersModal = ({
  open,
  suppliers,
  onClose
}: {
  open: boolean
  suppliers: string[]
  onClose: () => void
}) => {
  const [entry, setEntry] = useState('')

  const add = () => {
    const name = entry.trim()
    if (!name || suppliers.includes(name)) return
    setSuppliers([...suppliers, name])
    setEntry('')
  }

  return (
    <Overlay id='overlay-suppliers' comment='overlay-suppliers' open={open} onClose={onClose}>
      <div
        className='modal'
        style={{ maxWidth: '360px' }}
        data-comment='suppliers-modal'
        data-component='dialog'
      >
        <ModalHead
          comment='suppliers-head'
          titleComment='suppliers-title'
          descComment='suppliers-desc'
          title='Coil suppliers'
          desc='Rollforming — supplier list for coil assignment.'
          onClose={onClose}
        />
        <div className='modal-body' id='suppliers-body' data-comment='suppliers-body'>
          <div
            className='checklist'
            data-comment='suppliers-list'
            style={{ flexDirection: 'column', alignItems: 'stretch' }}
          >
            {suppliers.map((supplier, index) => (
              <div
                className='mrow'
                data-comment={`supplier-row-${index}`}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-sm)',
                  marginBottom: '6px'
                }}
                key={supplier}
              >
                <span className='mrow-name' data-comment={`supplier-name-${index}`}>
                  {supplier}
                </span>
                <span className='toolbar-spacer' />
                <button
                  className='icon-btn danger'
                  aria-label='Remove supplier'
                  data-comment={`supplier-del-${index}`}
                  onClick={() => setSuppliers(suppliers.filter(other => other !== supplier))}
                >
                  <Trash2 style={{ width: '14px', height: '14px' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className='modal-foot' data-comment='suppliers-foot'>
          <input
            className='input'
            id='supplier-new'
            data-comment='supplier-new'
            placeholder='Add supplier…'
            style={{ flex: 1 }}
            value={entry}
            onChange={event => setEntry(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && add()}
          />
          <button className='btn btn-primary' data-comment='supplier-add' onClick={add}>
            Add
          </button>
        </div>
      </div>
    </Overlay>
  )
}

/** N-189: the heaviest package a department should build; the Wrapping screens warn above it. */
export const PkgMaxModal = ({
  dept,
  current,
  onClose,
  onSaved
}: {
  dept: string | null
  current: number
  onClose: () => void
  onSaved: (message: string) => void
}) => {
  const [value, setValue] = useState(() => (current ? String(current) : ''))

  const save = () => {
    if (!dept) return
    const parsed = parseInt(value, 10)
    const max = isNaN(parsed) || parsed < 0 ? 0 : parsed

    setPkgMax(dept, max)
    onSaved(`Max package weight for ${dept}: ${max ? `${max} lb` : 'no limit'}`)
    onClose()
  }

  return (
    <Overlay id='overlay-pkgmax' comment='overlay-pkgmax' open={!!dept} onClose={onClose}>
      <div
        className='modal'
        style={{ maxWidth: '360px' }}
        data-comment='pkgmax-modal'
        data-component='dialog'
      >
        <ModalHead
          comment='pkgmax-head'
          titleComment='pkgmax-title'
          descComment='pkgmax-desc'
          title='Max package weight'
          desc={
            dept
              ? `${dept} — heaviest package this department should build.`
              : 'Heaviest package this department should build.'
          }
          onClose={onClose}
        />
        <div className='modal-body' data-comment='pkgmax-body'>
          <div className='field' data-comment='pkgmax-field'>
            <label className='field-label' data-comment='pkgmax-label'>
              Max package weight (lb)
            </label>
            <NumberInput
              comment='pkgmax-input'
              min={0}
              placeholder='e.g. 500'
              value={value}
              onValueChange={setValue}
            />
          </div>
          <div className='field-hint' data-comment='pkgmax-hint'>
            0 = no limit. Wrapping shows the running package weight against this number and warns
            before printing a heavier label.
          </div>
        </div>
        <div className='modal-foot' data-comment='pkgmax-foot'>
          <button className='btn' data-comment='pkgmax-cancel' onClick={onClose}>
            Cancel
          </button>
          <button className='btn btn-primary' data-comment='pkgmax-save' onClick={save}>
            Save
          </button>
        </div>
      </div>
    </Overlay>
  )
}
