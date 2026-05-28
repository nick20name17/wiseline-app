import { createFileRoute } from '@tanstack/react-router'

import { DriverScanner } from './-components/scanner'
import { ScannerTop } from './-components/scanner-top'

const RouteComponent = () => {
  return (
    <div className='-mx-4 flex h-screen flex-col gap-4'>
      <ScannerTop />
      <DriverScanner />
    </div>
  )
}

export const Route = createFileRoute('/driver/$load/scanner/')({
  component: RouteComponent
})
