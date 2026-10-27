import { RowActions } from '@/components/row-actions'
import { useDeleteLocation, useDeleteLocationType, type Location, type LocationType } from '../api'
import { UpdateLocationDialog } from './location-dialog'
import { UpdateLocationTypeDialog } from './location-type-dialog'

export const LocationActions = ({ location }: { location: Location }) => {
  const deletion = useDeleteLocation()

  return (
    <RowActions
      name={location.code ?? 'location'}
      edit={dialog => <UpdateLocationDialog location={location} {...dialog} />}
      remove={{
        title: `Delete location ${location.code ?? ''}?`,
        description: 'Anything standing on it loses where it is. This cannot be undone.',
        isPending: deletion.isPending,
        onConfirm: () => deletion.mutateAsync(location.id)
      }}
    />
  )
}

export const LocationTypeActions = ({ locationType }: { locationType: LocationType }) => {
  const deletion = useDeleteLocationType()

  return (
    <RowActions
      name={locationType.name ?? 'location type'}
      edit={dialog => <UpdateLocationTypeDialog locationType={locationType} {...dialog} />}
      remove={{
        title: `Delete location type ${locationType.name ?? ''}?`,
        // The API refuses while any location still points here, so say it first.
        description:
          'The locations under it would be left without a department, so the delete is refused while any of them still exist.',
        isPending: deletion.isPending,
        onConfirm: () => deletion.mutateAsync(locationType.id)
      }}
    />
  )
}
