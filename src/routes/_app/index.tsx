import { TonightCard } from '@/features/moon'
import { createFileRoute } from '@tanstack/react-router'

const HomePage = () => {
  return (
    <div className='flex flex-col gap-10'>
      <section className='flex flex-col gap-4'>
        <h1 className='font-heading text-3xl font-semibold tracking-tight'>Wiseline PM</h1>
        <p className='max-w-prose text-muted-foreground'>
          A small example app: one shared layout, two pages. The header, footer and page frame live
          in the root route, so every page inherits them.
        </p>
      </section>

      <TonightCard date={new Date()} />
    </div>
  )
}

export const Route = createFileRoute('/_app/')({
  staticData: { crumb: 'Dashboard' },
  component: HomePage
})
