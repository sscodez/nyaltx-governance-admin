import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'

import { getDb } from '@/lib/mongodb'

type SectionPayload = {
  title: string
}

const collectionName = 'kanbanSections'
const sanitize = (section: any) => ({
  id: section._id?.toString(),
  title: section.title,
})

export const GET = async () => {
  const db = await getDb()
  const sections = await db.collection(collectionName).find({}).sort({ order: 1 }).toArray()
  return NextResponse.json(sections.map(sanitize))
}

export const POST = async (request: Request) => {
  const payload = (await request.json()) as SectionPayload
  if (!payload?.title) {
    return NextResponse.json({ message: 'title is required' }, { status: 400 })
  }

  const db = await getDb()
  const doc = { title: payload.title, order: Date.now(), createdAt: new Date().toISOString() }
  const result = await db.collection(collectionName).insertOne(doc)
  return NextResponse.json(sanitize({ ...doc, _id: result.insertedId }), { status: 201 })
}

export const PUT = async (request: Request) => {
  const payload = (await request.json()) as SectionPayload & { id?: string }
  if (!payload?.id) {
    return NextResponse.json({ message: 'id is required' }, { status: 400 })
  }

  const db = await getDb()
  await db.collection(collectionName).updateOne({ _id: new ObjectId(payload.id) }, { $set: { title: payload.title } })
  const section = await db.collection(collectionName).findOne({ _id: new ObjectId(payload.id) })
  if (!section) {
    return NextResponse.json({ message: 'Section not found' }, { status: 404 })
  }
  return NextResponse.json(sanitize(section))
}

export const DELETE = async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ message: 'id query parameter is required' }, { status: 400 })
  }

  const db = await getDb()
  await db.collection(collectionName).deleteOne({ _id: new ObjectId(id) })
  await db.collection('kanbanTasks').deleteMany({ sectionId: id })
  return NextResponse.json({ success: true })
}
