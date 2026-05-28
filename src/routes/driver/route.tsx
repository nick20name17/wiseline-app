import { Outlet, createFileRoute } from '@tanstack/react-router'

import { DriverHeader } from './-components/header'

const DriverLayout = () => {
  return (
    <div className='flex h-screen flex-col'>
      <DriverHeader />
      <div className='container mb-4 flex min-h-0 flex-1 flex-col'>
        <Outlet />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/driver')({
  component: DriverLayout
})
