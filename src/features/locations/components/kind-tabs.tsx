import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LOCATION_KIND_LABELS, LOCATION_KINDS, type LocationKind } from '../api'

/** Which of a department's places the page lists: where packages stand, or where coils are kept. */
export const KindTabs = ({
  kind,
  noun,
  onChange
}: {
  kind: LocationKind
  /** What the tabs list, after the kind: «Locations», «Location Types». */
  noun: string
  onChange: (kind: LocationKind) => void
}) => (
  <Tabs value={kind} onValueChange={value => onChange(value as LocationKind)}>
    <TabsList>
      {LOCATION_KINDS.map(option => (
        <TabsTrigger key={option} value={option}>
          {LOCATION_KIND_LABELS[option]} {noun}
        </TabsTrigger>
      ))}
    </TabsList>
  </Tabs>
)
