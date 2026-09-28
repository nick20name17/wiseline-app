import { ColorsPage, colorsSearchSchema } from '@/features/colors'
import { createFileRoute } from '@tanstack/react-router'

const ColorsRoute = () => {
  const { search, show } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <ColorsPage
      search={search}
      show={show}
      onSearchChange={next =>
        void navigate({ search: prev => ({ ...prev, search: next }), replace: true })
      }
      onShowChange={next =>
        void navigate({
          search: prev => ({ ...prev, show: next === 'all' ? undefined : next }),
          replace: true
        })
      }
    />
  )
}

export const Route = createFileRoute('/_app/_auth/settings/colors')({
  staticData: { crumb: 'Colors' },
  validateSearch: colorsSearchSchema,
  component: ColorsRoute
})
