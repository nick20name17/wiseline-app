import { useSearch } from '@tanstack/react-router'

import { DEFAULT_DATE_VALUE } from '@/components/common/filters/date'
import { Scanner, type ScannerProps } from '@/components/common/scanner'

interface LoadScannerProps {
  onSuccess: ScannerProps['onSuccess']
  error: ScannerProps['error']
  isPending?: ScannerProps['isPending']
}

export const LoadScanner = ({ onSuccess, error, isPending }: LoadScannerProps) => {
  const { load, truck, date = DEFAULT_DATE_VALUE } = useSearch({ from: '/scanner/' })

  const missingFields = [!load && 'Load', !truck && 'Truck', !date && 'Date'].filter(
    Boolean
  ) as string[]

  return (
    <Scanner
      onSuccess={onSuccess}
      error={error}
      isPending={isPending}
      enabled={missingFields.length === 0}
      disabledReason={missingFields}
    />
  )
}
