import type * as React from 'react'

type AuthCardProps = {
  title: string
  description: string
  children: React.ReactNode
}

/**
 * The branded panel every signed-out page sits in: sign in, forgot password, reset password. A phone's
 * screen is the panel, so there the frame goes and the fields take its width.
 */
export const AuthCard = ({ title, description, children }: AuthCardProps) => (
  <div className='w-full max-w-95 rounded-xl border border-border bg-card px-7.5 pt-8 pb-6.5 shadow-lg max-sm:border-0 max-sm:bg-transparent max-sm:px-0 max-sm:shadow-none'>
    <div className='mb-6 flex items-center justify-center gap-2.5'>
      <img src='/icon-512.png' alt='' className='size-8.5 flex-none' />
      <div>
        <div className='font-heading text-lg leading-tight font-semibold tracking-tight'>
          Wiseline
        </div>
        <div className='text-xs tracking-wider text-muted-foreground uppercase'>Production</div>
      </div>
    </div>

    <h1 className='text-center text-xl font-semibold tracking-tight'>{title}</h1>
    <p className='mt-1.5 mb-6 text-center text-xs text-muted-foreground'>{description}</p>

    {children}
  </div>
)
