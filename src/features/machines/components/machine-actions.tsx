import { RowActions } from '@/components/row-actions'
import { isRequired, useDeleteMachine, type Machine } from '../api'
import { UpdateMachineDialog } from './machine-dialog'

export const MachineActions = ({ machine }: { machine: Machine }) => {
  // The schema lets the name be null, though the database always has one.
  const name = machine.name ?? `#${machine.id}`
  const deletion = useDeleteMachine()

  return (
    <RowActions
      name={name}
      edit={dialog => <UpdateMachineDialog machine={machine} {...dialog} />}
      // The department's work passes through it, so the API refuses to delete it.
      remove={
        isRequired(machine.kind)
          ? undefined
          : {
              title: `Delete machine ${name}?`,
              description:
                'Its tab goes with it, and the line items routed to it are left without a machine. This cannot be undone.',
              isPending: deletion.isPending,
              onConfirm: () => deletion.mutateAsync(machine.id)
            }
      }
    />
  )
}
