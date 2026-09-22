import { FieldLabel } from '@/components/ui/field'

type RequiredLabelProps = { htmlFor?: string; children: string }

export const RequiredLabel = ({ htmlFor, children }: RequiredLabelProps) => (
  <FieldLabel htmlFor={htmlFor}>
    {children}
    {/* The field is marked required on the control itself; the star is for the eye. The label lays
        its children out with a gap, which the negative margin takes back. */}
    <span aria-hidden className='-ml-1.5 text-destructive'>
      *
    </span>
  </FieldLabel>
)
