import { RowActions } from '@/components/row-actions'
import { REQUIRED_KINDS, useDeleteMachine, type Machine } from '../api'
import { UpdateMachineDialog } from './machine-dialog'

export const MachineActions = ({ machine }: { machine: Machine }) => {
  // The schema lets the name be null, though the database always has one.
  const name = machine.name ?? `#${machine.id}`
  const deletion = useDeleteMachine()
  const required = REQUIRED_KINDS.some(kind => kind === machine.kind)

  return (
    <RowActions
      name={name}
      edit={dialog => <UpdateMachineDialog machine={machine} {...dialog} />}
      remove={{
        title: `Delete machine ${name}?`,
        description: required
          ? `The department's work passes through ${name}, so it cannot be deleted. Its capacity can still be edited.`
          : 'Its tab goes with it, and the line items routed to it are left without a machine. This cannot be undone.',
        blocked: required,
        isPending: deletion.isPending,
        onConfirm: () => deletion.mutateAsync(machine.id)
      }}
    />
  )
}
