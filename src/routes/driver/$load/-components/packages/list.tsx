import { PackageCard } from './card'
import type { SingleLoad } from '@/api/loads/schema'

interface PackagesListProps {
  load: SingleLoad
  isLoading: boolean
}

export const PackagesList = ({ load }: PackagesListProps) => {
  return (
    <div className='grid gap-2'>
      {load?.packages?.map((pack) => (
        <PackageCard
          pack={pack}
          key={pack.id}
        />
      ))}
      {load?.skids?.map((skid) => (
        <PackageCard
          pack={skid}
          key={skid.id}
        />
      ))}
    </div>
  )
}
