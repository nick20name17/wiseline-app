import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { roleLabel, ROLES, type Role } from '../lib/roles'

type RoleSelectProps = {
  id: string
  value: Role
  onChange: (role: Role) => void
  invalid?: true
}

export const RoleSelect = ({ id, value, onChange, invalid }: RoleSelectProps) => (
  // The select can hand back null when it clears, which this list never does.
  <Select value={value} onValueChange={role => role && onChange(role)}>
    <SelectTrigger id={id} className='w-full' aria-invalid={invalid}>
      <SelectValue>{(role: Role) => roleLabel(role)}</SelectValue>
    </SelectTrigger>
    <SelectContent>
      {ROLES.map(role => (
        <SelectItem key={role} value={role}>
          {roleLabel(role)}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)
