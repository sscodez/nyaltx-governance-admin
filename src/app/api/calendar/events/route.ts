import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'

import { getDb } from '@/lib/mongodb'

type CalendarEventPayload = {
  title: string
  start: string
  end?: string
  className?: string
  allDay?: boolean
}

const collectionName = 'calendarEvents'

const sanitize = (event: any) => ({
  ...event,
  id: event._id?.toString(),
  _id: undefined,
})

export const GET = async () => {
  const db = await getDb()
  const events = await db.collection(collectionName).find({}).sort({ start: 1 }).toArray()
  return NextResponse.json(events.map(sanitize))
}

export const POST = async (request: Request) => {
  const payload = (await request.json()) as CalendarEventPayload
  if (!payload?.title || !payload?.start) {
    return NextResponse.json({ message: 'title and start are required' }, { status: 400 })
  }

  const db = await getDb()
  const document = {
    title: payload.title,
    start: payload.start,
    end: payload.end ?? null,
    className: payload.className ?? 'bg-primary',
    allDay: payload.allDay ?? false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const result = await db.collection(collectionName).insertOne(document)
  return NextResponse.json(sanitize({ ...document, _id: result.insertedId }), { status: 201 })
}

export const PUT = async (request: Request) => {
  const payload = (await request.json()) as CalendarEventPayload & { id?: string }
  if (!payload?.id) {
    return NextResponse.json({ message: 'id is required' }, { status: 400 })
  }

  const db = await getDb()
  const { id, ...updates } = payload
  const updateDoc: Record<string, any> = { updatedAt: new Date().toISOString() }
  if (updates.title !== undefined) updateDoc.title = updates.title
  if (updates.start !== undefined) updateDoc.start = updates.start
  if (updates.end !== undefined) updateDoc.end = updates.end
  if (updates.className !== undefined) updateDoc.className = updates.className
  if (updates.allDay !== undefined) updateDoc.allDay = updates.allDay

  await db
    .collection(collectionName)
    .updateOne({ _id: new ObjectId(id) }, { $set: updateDoc })

  const updated = await db.collection(collectionName).findOne({ _id: new ObjectId(id) })
  if (!updated) {
    return NextResponse.json({ message: 'Event not found' }, { status: 404 })
  }
  return NextResponse.json(sanitize(updated))
}

export const DELETE = async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ message: 'id query parameter is required' }, { status: 400 })
  }

  const db = await getDb()
  await db.collection(collectionName).deleteOne({ _id: new ObjectId(id) })
  return NextResponse.json({ success: true })
}
