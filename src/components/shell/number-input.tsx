import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput
} from '@/components/reui/number-field'

/**
 * Every number a person types in this app, with a stepper attached.
 *
 * A bare `<input type="number">` gives you the browser's own spinner — invisible until hover, tiny,
 * and absent on touch, which is most of where this runs.
 *
 * It carries its own frame rather than the page's `.input` class, deliberately: those classes pin a
 * width (the Coil Filter's is 74px) that two stepper buttons do not fit inside, and the result was a
 * field with no room left to read. The frame here is drawn from the same custom properties the
 * prototype's inputs use, so it still belongs to whatever page it lands on.
 *
 * `value` is a string because the forms it serves hold drafts, and an empty field is a real state
 * that `0` would quietly overwrite.
 */
export const NumberInput = ({
  value,
  onValueChange,
  comment,
  /** `compact` is the inline, right-aligned field a filter row wants; `default` fills its field. */
  variant = 'default',
  min,
  max,
  step,
  placeholder,
  disabled,
  ariaLabel
}: {
  value: string
  onValueChange: (value: string) => void
  comment?: string
  variant?: 'default' | 'compact'
  min?: number
  max?: number
  step?: number
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
}) => (
  <NumberField
    locale='en-US'
    format={{ useGrouping: false, maximumFractionDigits: 6 }}
    value={value === '' ? null : Number(value)}
    onValueChange={next => onValueChange(next == null ? '' : String(next))}
    min={min}
    max={max}
    step={step}
    disabled={disabled}
  >
    <NumberFieldGroup className={`wl-numfield wl-numfield-${variant}`}>
      <NumberFieldDecrement className='wl-numfield-step' />
      <NumberFieldInput
        className='wl-numfield-input mono'
        data-comment={comment}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      <NumberFieldIncrement className='wl-numfield-step' />
    </NumberFieldGroup>
  </NumberField>
)
