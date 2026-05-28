import { RiAlertFill, RiRestartLine } from '@remixicon/react'
import { type ErrorComponentProps } from '@tanstack/react-router'
import * as z from 'zod/mini'

import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/helpers/error-message'

export const Error = ({ reset, error }: ErrorComponentProps) => {
  const errorMessage = getErrorMessage(error)

  const zodIssues = error.cause instanceof z.core.$ZodError ? error.cause.issues : null

  return (
    <>
      <title>Something went wrong</title>
      <div className='from-background to-muted/30 flex h-screen flex-col items-center justify-center rounded-lg bg-linear-to-b p-6'>
        <div className='container flex max-w-3xl flex-col items-center justify-center gap-6 px-4 py-16 text-center'>
          <div className='bg-destructive/5 rounded-full p-6'>
            <RiAlertFill className='text-destructive size-12' />
          </div>

          <h2 className='text-3xl font-bold tracking-tight'>Something went wrong</h2>

          <p className='text-muted-foreground'>
            We encountered an unexpected error. This is likely a temporary issue that we're working
            to fix.
          </p>

          <div className='bg-muted w-full overflow-auto rounded-md p-4 text-left text-sm'>
            <p className='text-destructive mb-4 font-mono'>{errorMessage}</p>

            {zodIssues && (
              <div className='max-h-64 overflow-auto'>
                <table className='w-full border-collapse text-left text-xs'>
                  <thead>
                    <tr className='border-border bg-muted/50 border-b'>
                      <th className='p-2 font-semibold'>Path</th>
                      <th className='p-2 font-semibold'>Expected</th>
                      <th className='p-2 font-semibold'>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zodIssues.map((issue, idx) => {
                      return (
                        <tr
                          key={idx}
                          className='border-border border-b last:border-0'
                        >
                          <td className='p-2 font-mono text-red-500'>{issue.path.join('.')}</td>
                          <td className='p-2 font-mono text-blue-500'>
                            {issue.code === 'invalid_type' ? issue.expected : '-'}
                          </td>
                          <td className='p-2'>{issue.message}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Button
            onClick={reset}
            variant='default'
            size='lg'
            className='gap-2'
          >
            <RiRestartLine />
            Try again
          </Button>
        </div>
      </div>
    </>
  )
}
