import { render, screen } from '@testing-library/react'
import { TriangleAlert } from 'lucide-react'

import { StatusPage } from '@/components/status-page'

it('renders code, title, description and actions', () => {
  render(
    <StatusPage
      code='500'
      icon={<TriangleAlert />}
      title='Something went wrong'
      description='An unexpected error occurred.'
      actions={<button type='button'>Retry</button>}
    />
  )

  expect(screen.getByText('500')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  expect(screen.getByText('Something went wrong')).toBeInTheDocument()
})
