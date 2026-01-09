import { MongoClient, MongoClientOptions } from 'mongodb'


const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'nyaltx_admin'
const hasMongoEnv = Boolean(uri)

let client: MongoClient
let clientPromise: Promise<MongoClient>

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

const options: MongoClientOptions = {}

if (hasMongoEnv) {
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri as string, options)
      global._mongoClientPromise = client.connect()
    }
    clientPromise = global._mongoClientPromise
  } else {
    client = new MongoClient(uri as string, options)
    clientPromise = client.connect()
  }
} else {
  clientPromise = Promise.reject(new Error('Missing MONGODB_URI environment variable'))
}

export const getDb = async () => {
  if (!hasMongoEnv) {
    throw new Error('Missing MONGODB_URI environment variable')
  }
  const mongoClient = await clientPromise
  return mongoClient.db(dbName)
}

export default hasMongoEnv ? clientPromise : undefined
