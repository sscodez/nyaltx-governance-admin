'use client'
import { DateInput, EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core'
import { DateClickArg, Draggable, type DropArg } from '@fullcalendar/interaction'
import { useCallback, useEffect, useMemo, useState } from 'react'

export type SubmitEventType = {
  title: string
  category: string
}

const useCalendar = () => {
  const [show, setShow] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const onOpenModal = () => setShow(true)
  const [isEditable, setIsEditable] = useState<boolean>(false)
  const [events, setEvents] = useState<EventInput[]>([])
  const [eventData, setEventData] = useState<EventInput>()
  const [dateInfo, setDateInfo] = useState<DateClickArg>()

  const onCloseModal = () => {
    setEventData(undefined)
    setDateInfo(undefined)
    setShow(false)
  }

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/calendar/events')
        if (!response.ok) throw new Error('Unable to load calendar events')
        const data = await response.json()
        setEvents(data)
      } catch (err: any) {
        setError(err?.message || 'Failed to load events')
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

  useEffect(() => {
    // create draggable events
    const draggableEl = document.getElementById('external-events')
    if (draggableEl) {
      new Draggable(draggableEl, {
        itemSelector: '.external-event',
      })
    }
  }, [])

  const onDateClick = (arg: DateClickArg) => {
    setDateInfo(arg)
    onOpenModal()
    setIsEditable(false)
  }

  const onEventClick = (arg: EventClickArg) => {
    const event = {
      id: String(arg.event.id),
      title: arg.event.title,
      className: arg.event.classNames[0],
    }
    setEventData(event)
    setIsEditable(true)
    onOpenModal()
  }

  const onDrop = (arg: DropArg) => {
    const dropEventData = arg
    const title = dropEventData.draggedEl.title
    if (title) {
      const newEvent = {
        id: String(events.length + 1),
        title: title,
        start: dropEventData ? dropEventData.dateStr : new Date(),
        className: dropEventData.draggedEl.dataset.class,
      }
      const modifiedEvents = [...events]
      modifiedEvents.push(newEvent)

      setEvents(modifiedEvents)
    }
  }

  const persistEvent = useCallback(async (method: 'POST' | 'PUT' | 'DELETE', body?: Record<string, any>, query?: Record<string, string>) => {
    const url = new URL('/api/calendar/events', window.location.origin)
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
    }
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!response.ok) {
      const message = await response.json().catch(() => ({}))
      throw new Error(message?.message || 'Unable to update calendar')
    }
    return response.json()
  }, [])

  const onAddEvent = (data: SubmitEventType) => {
    const modifiedEvents = [...events]
    const event = {
      id: String(modifiedEvents.length + 1),
      title: data.title,
      start: Object.keys(dateInfo ?? {}).length !== 0 ? dateInfo?.date : new Date(),
      className: data.category,
    }
    const optimisticEvents = [...modifiedEvents, event]
    setEvents(optimisticEvents)
    persistEvent('POST', {
      title: event.title,
      start: (dateInfo?.date ?? new Date()).toISOString(),
      className: event.className,
    })
      .then((created) => {
        setEvents((prev) => prev.map((evt) => (evt.id === event.id ? { ...evt, ...created } : evt)))
      })
      .catch((err: any) => {
        setEvents(modifiedEvents)
        setError(err?.message || 'Unable to add event')
      })
    onCloseModal()
  }

  const onUpdateEvent = (data: SubmitEventType) => {
    console.info(data)
    setEvents(
      events.map((e) => {
        if (e.id === eventData?.id) {
          return {
            ...e,
            title: data.title,
            className: data.category,
          }
        } else {
          return e
        }
      }),
    )
    persistEvent('PUT', {
      id: eventData?.id,
      title: data.title,
      className: data.category,
    }).catch((err: any) => setError(err?.message || 'Unable to update event'))
    onCloseModal()
    setIsEditable(false)
  }

  const onRemoveEvent = () => {
    const modifiedEvents = [...events]
    const idx = modifiedEvents.findIndex((e) => e.id === eventData?.id)
    modifiedEvents.splice(idx, 1)
    setEvents(modifiedEvents)
    if (eventData?.id) {
      persistEvent('DELETE', undefined, { id: eventData.id }).catch((err: any) => {
        setError(err?.message || 'Unable to delete event')
      })
    }
    onCloseModal()
  }

  const onEventDrop = (arg: EventDropArg) => {
    const modifiedEvents = [...events]
    const idx = modifiedEvents.findIndex((e: EventInput) => e.id === arg.event.id)
    modifiedEvents[idx].title = arg.event.title
    modifiedEvents[idx].className = arg.event.classNames
    modifiedEvents[idx].start = arg.event.start as DateInput
    modifiedEvents[idx].end = arg.event.end as DateInput
    setEvents(modifiedEvents)
    persistEvent('PUT', {
      id: arg.event.id,
      start: arg.event.start?.toISOString(),
      end: arg.event.end?.toISOString(),
    }).catch((err: any) => setError(err?.message || 'Unable to update event'))
    setIsEditable(false)
  }

  const createNewEvent = () => {
    setIsEditable(false)
    onOpenModal()
  }

  return {
    createNewEvent,
    show,
    onDateClick,
    onEventClick,
    onDrop,
    onEventDrop,
    events,
    onCloseModal,
    isEditable,
    eventData,
    onUpdateEvent,
    onRemoveEvent,
    onAddEvent,
    loading,
    error,
  }
}

export default useCalendar
