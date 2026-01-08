import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'

import { getDb } from '@/lib/mongodb'

const collectionName = 'kanbanTasks'

const sanitize = (task: any) => ({
  ...task,
  id: task._id?.toString(),
  _id: undefined,
})

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const sectionId = searchParams.get('sectionId')
  const query = sectionId ? { sectionId } : {}

  const db = await getDb()
  const tasks = await db.collection(collectionName).find(query).sort({ order: 1 }).toArray()
  return NextResponse.json(tasks.map(sanitize))
}

export const POST = async (request: Request) => {
  const payload = (await request.json()) as any
  if (!payload?.sectionId || !payload?.title) {
    return NextResponse.json({ message: 'sectionId and title are required' }, { status: 400 })
  }

  const db = await getDb()
  const doc = {
    sectionId: payload.sectionId,
    title: payload.title,
    description: payload.description ?? '',
    variant: payload.variant ?? 'primary',
    views: payload.views ?? 0,
    share: payload.share ?? 0,
    commentsCount: payload.commentsCount ?? 0,
    progress: payload.progress ?? null,
    members: payload.members ?? [],
    order: Date.now(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const result = await db.collection(collectionName).insertOne(doc)
  return NextResponse.json(sanitize({ ...doc, _id: result.insertedId }), { status: 201 })
}

export const PUT = async (request: Request) => {
  const payload = (await request.json()) as any
  if (!payload?.id) {
    return NextResponse.json({ message: 'id is required' }, { status: 400 })
  }

  const db = await getDb()
  const { id, ...updates } = payload
  updates.updatedAt = new Date().toISOString()
  await db.collection(collectionName).updateOne({ _id: new ObjectId(id) }, { $set: updates })
  const task = await db.collection(collectionName).findOne({ _id: new ObjectId(id) })
  if (!task) {
    return NextResponse.json({ message: 'Task not found' }, { status: 404 })
  }
  return NextResponse.json(sanitize(task))
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
