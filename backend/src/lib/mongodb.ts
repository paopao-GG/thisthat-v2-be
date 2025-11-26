// MongoDB client for testing (V1)
import { MongoClient, Db } from 'mongodb';

let mongoClient: MongoClient | null = null;
let database: Db | null = null;

export async function connectMongoDB(): Promise<Db> {
  if (database) {
    return database;
  }

  const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'thisthat_test';

  mongoClient = new MongoClient(mongoUrl);
  await mongoClient.connect();

  database = mongoClient.db(dbName);

  console.log(`✅ Connected to MongoDB: ${dbName}`);

  return database;
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!mongoClient) {
    await connectMongoDB();
  }
  return mongoClient!;
}

export async function getDatabase(): Promise<Db> {
  if (!database) {
    await connectMongoDB();
  }
  return database!;
}

export async function closeMongoDB(): Promise<void> {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    database = null;
    console.log('✅ MongoDB connection closed');
  }
}
