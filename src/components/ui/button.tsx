import { RiLoader2Fill } from '@remixicon/react'
import { type VariantProps, cva } from 'class-variance-authority'
import { Slot as SlotPrimitive } from 'radix-ui'
import * as React from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap leading-none rounded-md text-sm transition-all disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none  focus-visible:ring-ring focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border border-transparent",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/85 active:bg-primary active:border-[#63D196]',
        destructive:
          'bg-destructive text-background hover:bg-destructive/90 active:bg-destructive active:border-[#EF8D8D]',
        outline:
          'border-border bg-background hover:bg-secondary hover:text-accent-foreground active:bg-background active:border-foreground/50',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-muted-foreground/25 active:bg-secondary active:border-border',
        ghost: 'hover:bg-accent hover:text-accent-foreground active:bg-transparent',
        info: 'bg-info hover:bg-info/90 text-background active:bg-info active:border-[#9DC1FD]'
      },
      size: {
        default: 'h-9 p-2.5',
        sm: "h-7.5 rounded-md gap-1.5 p-2  [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-10 rounded-md px-6 text-base',
        icon: 'size-9',
        'icon-sm': 'size-7.5'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
) satisfies ReturnType<typeof cva>

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  } & {
    isLoading?: boolean
  }

const Button = ({
  className,
  variant,
  size,
  asChild = false,
  isLoading,
  children,
  ...props
}: ButtonProps) => {
  const Comp = asChild ? SlotPrimitive.Slot : 'button'

  return (
    <Comp
      data-slot='button'
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {isLoading ? <RiLoader2Fill className='animate-spin' /> : children}
    </Comp>
  )
}

export { Button, buttonVariants }
