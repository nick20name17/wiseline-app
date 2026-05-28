import { Outlet, createFileRoute } from '@tanstack/react-router'

import { SettingsHeader } from './-components/header'

const SettingsLayout = () => {
  return (
    <>
      <SettingsHeader />
      <main className='container h-(--main-height) pb-4'>
        <Outlet />
      </main>
    </>
  )
}

export const Route = createFileRoute('/_settings')({
  component: SettingsLayout
})
