import { Outlet, createFileRoute } from '@tanstack/react-router'

import { ShippingHeader } from './-components/header'

const ShippingLayout = () => {
  return (
    <>
      <ShippingHeader />
      <main className='container h-(--main-height) pb-4'>
        <Outlet />
      </main>
    </>
  )
}

export const Route = createFileRoute('/_shipping')({
  component: ShippingLayout
})
