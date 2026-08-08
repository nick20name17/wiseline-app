import { createFileRoute } from '@tanstack/react-router'

const HomePage = () => {
  return <h1 className='text-2xl font-semibold'>top-secret</h1>
}

export const Route = createFileRoute('/_authenticated/')({
  component: HomePage
})
