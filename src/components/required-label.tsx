import { FieldLabel, FieldLegend } from '@/components/ui/field'
import { cn } from 'cn'

type RequiredLabelProps = { htmlFor?: string; children: string }

// The field is marked required on the control itself; the star is for the eye.
const Star = ({ className }: { className: string }) => (
  <span aria-hidden className={cn('text-destructive', className)}>
    *
  </span>
)

export const RequiredLabel = ({ htmlFor, children }: RequiredLabelProps) => (
  <FieldLabel htmlFor={htmlFor}>
    {children}
    {/* The label lays its children out with a gap, which the negative margin takes back. */}
    <Star className='-ml-1.5' />
  </FieldLabel>
)

/** The same, heading a group of controls such as radios, which a single label cannot name. */
export const RequiredLegend = ({ children }: { children: string }) => (
  <FieldLegend variant='label'>
    {children}
    <Star className='ml-0.5' />
  </FieldLegend>
)
