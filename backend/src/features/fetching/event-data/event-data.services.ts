// Event data service - Fetch, normalize, and save
import { getPolymarketClient, type PolymarketEvent } from '../../../lib/polymarket-client.js';
import { getDatabase } from '../../../lib/mongodb.js';
import type { FlattenedEvent, EventStats } from './event-data.models.js';

const COLLECTION_NAME = 'events';

/**
 * Normalize Polymarket event data to our flat structure
 */
export function normalizeEvent(polymarketData: PolymarketEvent): FlattenedEvent {
  // Determine status - Gamma API uses active/closed/archived fields
  let status: 'active' | 'closed' | 'archived' = 'active';
  if (polymarketData.archived) {
    status = 'archived';
  } else if (polymarketData.closed) {
    status = 'closed';
  } else if (polymarketData.active === false) {
    status = 'closed';
  }

  // Extract market IDs if markets are included
  const marketIds = polymarketData.markets?.map(m => m.condition_id || m.question_id) || [];

  return {
    eventId: polymarketData.id,
    slug: polymarketData.slug,

    title: polymarketData.title,
    description: polymarketData.description || polymarketData.subtitle,

    // Gamma API uses 'image' and 'icon', fallback to legacy fields
    imageUrl: polymarketData.image || polymarketData.image_url,
    iconUrl: polymarketData.icon || polymarketData.icon_url,

    category: polymarketData.category,
    status,
    featured: polymarketData.featured,

    // Gamma API uses 'startDate' and 'endDate', fallback to legacy fields
    startDate: polymarketData.startDate || polymarketData.start_date_iso,
    endDate: polymarketData.endDate || polymarketData.end_date_iso,

    marketCount: polymarketData.markets?.length || 0,
    marketIds,

    source: 'polymarket',
    rawData: polymarketData, // Keep original for debugging

    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Fetch events from Polymarket and save to MongoDB
 */
export async function fetchAndSaveEvents(options?: {
  active?: boolean;
  limit?: number;
}): Promise<{ saved: number; errors: number }> {
  const client = getPolymarketClient();
  const db = await getDatabase();
  const collection = db.collection<FlattenedEvent>(COLLECTION_NAME);

  try {
    console.log('📡 Fetching events from Polymarket Gamma API...');
    const events = await client.getEvents({
      closed: options?.active === false, // Gamma API uses 'closed' parameter
      limit: options?.limit ?? 100,
      order: 'id', // Use id ordering for consistent pagination
      ascending: false, // Get newest first
    });

    // Check if events is an array
    if (!Array.isArray(events)) {
      console.error('❌ Polymarket API did not return an array. Response:', events);
      throw new Error('Invalid response from Polymarket API');
    }

    console.log(`✅ Fetched ${events.length} events from Polymarket`);

    let saved = 0;
    let errors = 0;

    for (const event of events) {
      try {
        const normalized = normalizeEvent(event);

        // Upsert to MongoDB (update if exists, insert if new)
        await collection.updateOne(
          { eventId: normalized.eventId },
          { $set: normalized },
          { upsert: true }
        );

        saved++;
      } catch (error) {
        console.error(`❌ Error saving event ${event.id}:`, error);
        errors++;
      }
    }

    console.log(`✅ Saved ${saved} events to MongoDB`);
    if (errors > 0) {
      console.log(`⚠️  ${errors} events failed to save`);
    }

    return { saved, errors };
  } catch (error) {
    console.error('❌ Error fetching events:', error);
    throw error;
  }
}

/**
 * Get all events from MongoDB
 */
export async function getAllEvents(filter?: {
  status?: 'active' | 'closed' | 'archived';
  category?: string;
  featured?: boolean;
  limit?: number;
  skip?: number;
}): Promise<FlattenedEvent[]> {
  const db = await getDatabase();
  const collection = db.collection<FlattenedEvent>(COLLECTION_NAME);

  const query: any = {};
  if (filter?.status) query.status = filter.status;
  if (filter?.category) query.category = filter.category;
  if (filter?.featured !== undefined) query.featured = filter.featured;

  const cursor = collection
    .find(query)
    .sort({ updatedAt: -1 })
    .limit(filter?.limit || 100)
    .skip(filter?.skip || 0);

  return await cursor.toArray();
}

/**
 * Get event statistics
 */
export async function getEventStats(): Promise<EventStats> {
  const db = await getDatabase();
  const collection = db.collection<FlattenedEvent>(COLLECTION_NAME);

  const [total, active, closed, archived, featured] = await Promise.all([
    collection.countDocuments(),
    collection.countDocuments({ status: 'active' }),
    collection.countDocuments({ status: 'closed' }),
    collection.countDocuments({ status: 'archived' }),
    collection.countDocuments({ featured: true }),
  ]);

  // Get category counts
  const categoryPipeline = [
    { $match: { category: { $exists: true, $ne: null } } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ];

  const categoryResults = await collection.aggregate(categoryPipeline).toArray();
  const categoryCounts: Record<string, number> = {};
  for (const result of categoryResults) {
    categoryCounts[result._id] = result.count;
  }

  return {
    totalEvents: total,
    activeEvents: active,
    closedEvents: closed,
    archivedEvents: archived,
    featuredEvents: featured,
    categoryCounts,
    lastUpdated: new Date(),
  };
}
