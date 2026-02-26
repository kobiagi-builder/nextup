/**
 * Event Timeline
 *
 * Chronological event list with "Log Event" dialog.
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { CustomerEvent } from '../../types'
import { useCreateCustomerEvent } from '../../hooks'
import { formatEventDate } from '../../utils'

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  event_type: z.string().optional(),
})

type EventFormData = z.infer<typeof eventSchema>

interface EventTimelineProps {
  customerId: string
  events: CustomerEvent[]
  isLoading?: boolean
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  update: 'Update',
  meeting: 'Meeting',
  call: 'Call',
  email: 'Email',
  milestone: 'Milestone',
  note: 'Note',
}

export function EventTimeline({ customerId, events, isLoading }: EventTimelineProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const createEvent = useCreateCustomerEvent()

  const filteredEvents = typeFilter === 'all'
    ? events
    : events.filter(e => e.event_type === typeFilter)

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: { title: '', description: '', event_type: 'note' },
  })

  const handleSubmit = async (data: EventFormData) => {
    await createEvent.mutateAsync({
      customerId,
      title: data.title,
      description: data.description || undefined,
      event_type: data.event_type || 'note',
    })
    form.reset()
    setIsDialogOpen(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Activity Timeline</h3>
        <div className="flex items-center gap-2">
          {events.length > 0 && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-7 rounded-md border border-input bg-transparent px-2 text-[11px] text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All types</option>
              {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          )}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1">
              <Plus className="h-3 w-3" />
              Log Event
            </Button>
          </DialogTrigger>
          <DialogContent data-portal-ignore-click-outside className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Log Event</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
              <div>
                <Label htmlFor="event-title">Title *</Label>
                <Input id="event-title" {...form.register('title')} className="mt-1" autoFocus />
                {form.formState.errors.title && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.title.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="event-type">Type</Label>
                <select
                  id="event-type"
                  {...form.register('event_type')}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="event-description">Description</Label>
                <Textarea id="event-description" {...form.register('description')} rows={3} className="mt-1" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createEvent.isPending}>
                  {createEvent.isPending ? 'Saving...' : 'Save Event'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading events...</p>
      )}

      {!isLoading && events.length === 0 && (
        <p className="text-sm text-muted-foreground italic py-2">No events recorded yet.</p>
      )}

      {!isLoading && events.length > 0 && filteredEvents.length === 0 && (
        <p className="text-sm text-muted-foreground italic py-2">No events of this type.</p>
      )}

      {filteredEvents.length > 0 && (
        <div className="space-y-0">
          {filteredEvents.map((event, index) => (
            <div key={event.id} className="flex gap-3 py-2">
              <div className="flex flex-col items-center">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                {index < filteredEvents.length - 1 && (
                  <div className="flex-1 w-px bg-border mt-1" />
                )}
              </div>
              <div className="min-w-0 pb-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{event.title}</p>
                  {event.event_type && event.event_type !== 'update' && (
                    <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatEventDate(event.event_date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
