import { RiAddCircleFill, RiChatNewFill, RiSendPlaneFill } from '@remixicon/react'
import { useStore } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import * as z from 'zod/mini'

import { commentsService } from '@/api/comment/service'
import { LOADS_QUERY_KEYS } from '@/api/loads/query'
import { ORIGIN_ITEMS_QUERY_KEYS } from '@/api/origin-items/query'
import type { Comment, OriginItem } from '@/api/origin-items/schema'
import { PACKAGES_ITEMS_QUERY_KEYS } from '@/api/packages-items/query'
import { PACKAGES_QUERY_KEYS } from '@/api/packages/query'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet'
import { DATE_FORMAT } from '@/constants/date'
import { useAppForm } from '@/hooks/app-form'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth'
import { formatInitials } from '@/utils/format'

interface NoteDialogProps {
  className?: string
  originItem: OriginItem
}

export const NoteDialog = ({ className, originItem }: NoteDialogProps) => {
  const comments = originItem.item?.comments
  const lastComment = comments?.at(-1)

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size='sm'
          className={cn(className, lastComment && 'justify-normal px-1.5 py-1')}
          variant='outline'
        >
          {lastComment ? (
            <div className='flex w-full items-center justify-between gap-1 text-left'>
              <div className='flex min-w-0 flex-1 flex-col items-start gap-px'>
                <span className='text-muted-foreground w-full truncate text-[11px] leading-none'>
                  {lastComment.user?.first_name} {lastComment.user?.last_name}
                </span>
                <span className='w-full truncate text-sm leading-none'>{lastComment.text}</span>
              </div>
              <div className='bg-muted-foreground flex size-4 shrink-0 items-center justify-center rounded-full text-[11px] leading-none font-medium -tracking-[0.03rem]'>
                {comments?.length}
              </div>
            </div>
          ) : (
            <>
              <RiAddCircleFill />
              <span>Add Note</span>
            </>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add notes</SheetTitle>
        </SheetHeader>

        {comments?.length ? <NoteCards notes={comments} /> : <NoteEmptyState className='h-full' />}

        <SheetFooter className='pt-0'>
          <NoteAddForm
            className='mt-4'
            originItem={originItem}
          />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
const NoteEmptyState = ({ className }: { className?: string }) => {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <RiChatNewFill />
        </EmptyMedia>
        <EmptyTitle>No ship notes</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}

interface noteCardProps {
  note: Comment
}

const NoteCard = ({ note }: noteCardProps) => {
  const userInitials = formatInitials({
    firstName: note.user?.first_name,
    lastName: note.user?.last_name
  })
  const userFullName = `${note.user?.first_name} ${note.user?.last_name}`

  return (
    <Card>
      <CardHeader className='flex flex-row justify-between'>
        <div className='flex items-center gap-1.5'>
          <Avatar className='size-9'>
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
          <div className='space-y-1'>
            <CardTitle className='text-sm'>{userFullName}</CardTitle>
            <CardDescription className='text-xs'>{note.user.email}</CardDescription>
          </div>
        </div>
        <span className='text-muted-foreground text-xs'>
          {format(note.created_at, DATE_FORMAT.dotsDatetime)}
        </span>
      </CardHeader>
      <CardContent>
        <p className='text-sm'>{note.text}</p>
      </CardContent>
    </Card>
  )
}

const NoteCards = ({ notes, className }: { notes: Comment[]; className?: string }) => {
  return (
    <ScrollArea className={cn('h-[80%]', className)}>
      <div className='flex flex-col gap-2.5 px-5'>
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
          />
        ))}
      </div>
    </ScrollArea>
  )
}

const MessageSchema = z.object({
  message: z.string().check(z.minLength(1))
})

interface NoteAddFormProps {
  className?: string
  originItem: OriginItem
}

interface NoteAddFormProps {
  className?: string
  originItem: OriginItem
}

export const NoteAddForm = ({ className, originItem }: NoteAddFormProps) => {
  const { user } = useAuth()

  const form = useAppForm({
    defaultValues: {
      message: ''
    },
    validators: {
      onChange: MessageSchema,
      onSubmit: MessageSchema
    },
    onSubmit: ({ value }) => handleCreate(value.message)
  })

  const queryClient = useQueryClient()

  const createNoteMutation = useMutation({
    mutationFn: commentsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ORIGIN_ITEMS_QUERY_KEYS.all()
      })
      queryClient.invalidateQueries({
        queryKey: PACKAGES_ITEMS_QUERY_KEYS.all()
      })
      queryClient.invalidateQueries({
        queryKey: PACKAGES_QUERY_KEYS.all()
      })
      queryClient.invalidateQueries({
        queryKey: LOADS_QUERY_KEYS.all()
      })
    }
  })

  const handleCreate = (message: string) => {
    if (user && originItem?.item) {
      createNoteMutation.mutate({
        text: message,
        user: user.id,
        item: originItem.id
      })
    }
    form.reset()
  }

  const isValid = useStore(form.store, (s) => s.isValid)

  return (
    <form
      className={cn('flex w-full items-center gap-2.5', className)}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field
        name='message'
        children={(field) => (
          <Field className='flex-1'>
            <Input
              placeholder='Leave your note here...'
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </Field>
        )}
      />

      <Button
        size='icon'
        disabled={!isValid}
      >
        <RiSendPlaneFill />
      </Button>
    </form>
  )
}
