// Event-Market Group Service - Fetch events with their markets
import { getPolymarketClient, type PolymarketEvent } from '../../../lib/polymarket-client.js';
import { getDatabase } from '../../../lib/mongodb.js';
import { normalizeMarket } from '../market-data/market-data.services.js';
import type { FlattenedMarket } from '../market-data/market-data.models.js';

const EVENTS_COLLECTION = 'events';
const MARKETS_COLLECTION = 'markets';

export interface EventMarketGroup {
  eventId: string;
  eventTitle: string;
  eventDescription?: string;
  eventSlug: string;
  eventImage?: string;
  eventIcon?: string;
  category?: string;
  status: 'active' | 'closed' | 'archived';
  markets: FlattenedMarket[];
  totalLiquidity: number;
  totalVolume: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fetch events with their markets from Polymarket and save to MongoDB
 */
export async function fetchAndSaveEventMarketGroups(options?: {
  active?: boolean;
  limit?: number;
}): Promise<{ saved: number; errors: number }> {
  const client = getPolymarketClient();
  const db = await getDatabase();
  const eventsCollection = db.collection(EVENTS_COLLECTION);
  const marketsCollection = db.collection<FlattenedMarket>(MARKETS_COLLECTION);

  try {
    console.log('📡 Fetching events with markets from Polymarket Gamma API...');

    const events = await client.getEvents({
      closed: options?.active === false,
      limit: options?.limit ?? 50,
    });

    if (!Array.isArray(events)) {
      throw new Error('Invalid response from Polymarket API');
    }

    console.log(`✅ Fetched ${events.length} events from Polymarket`);

    let saved = 0;
    let errors = 0;

    for (const event of events) {
      try {
        // Skip events without markets
        if (!event.markets || event.markets.length === 0) {
          console.log(`⚠️  Skipping event ${event.id} - no markets`);
          continue;
        }

        // Normalize and save each market
        const normalizedMarkets: FlattenedMarket[] = [];
        for (const market of event.markets) {
          const normalized = normalizeMarket(market);

          // Save market to markets collection
          await marketsCollection.updateOne(
            { conditionId: normalized.conditionId },
            { $set: normalized },
            { upsert: true }
          );

          normalizedMarkets.push(normalized);
        }

        // Determine event status
        let status: 'active' | 'closed' | 'archived' = 'closed';
        if (event.archived) {
          status = 'archived';
        } else if (event.active) {
          status = 'active';
        } else if (event.closed) {
          status = 'closed';
        }

        // Create event-market group
        const eventGroup: EventMarketGroup = {
          eventId: event.id,
          eventTitle: event.title,
          eventDescription: event.description,
          eventSlug: event.slug,
          eventImage: event.image,
          eventIcon: event.icon,
          category: event.category,
          status,
          markets: normalizedMarkets,
          totalLiquidity: normalizedMarkets.reduce((sum, m) => sum + (parseFloat(m.liquidity || '0') || 0), 0),
          totalVolume: normalizedMarkets.reduce((sum, m) => sum + (parseFloat(m.volume || '0') || 0), 0),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Save event group
        await eventsCollection.updateOne(
          { eventId: event.id },
          { $set: eventGroup },
          { upsert: true }
        );

        saved++;
      } catch (error) {
        console.error(`❌ Error saving event ${event.id}:`, error);
        errors++;
      }
    }

    console.log(`✅ Saved ${saved} event-market groups to MongoDB`);
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
 * Get all event-market groups from MongoDB
 */
export async function getAllEventMarketGroups(filter?: {
  status?: 'active' | 'closed' | 'archived';
  category?: string;
  limit?: number;
  skip?: number;
}): Promise<EventMarketGroup[]> {
  const db = await getDatabase();
  const collection = db.collection<EventMarketGroup>(EVENTS_COLLECTION);

  const query: any = {};
  if (filter?.status) query.status = filter.status;
  if (filter?.category) query.category = filter.category;

  const cursor = collection
    .find(query)
    .sort({ updatedAt: -1 })
    .limit(filter?.limit || 50)
    .skip(filter?.skip || 0);

  return await cursor.toArray();
}

/**
 * Get a single event-market group by event ID
 */
export async function getEventMarketGroup(eventId: string): Promise<EventMarketGroup | null> {
  const db = await getDatabase();
  const collection = db.collection<EventMarketGroup>(EVENTS_COLLECTION);

  return await collection.findOne({ eventId });
}

/**
 * Get event-market group statistics
 */
export async function getEventMarketGroupStats() {
  const db = await getDatabase();
  const collection = db.collection<EventMarketGroup>(EVENTS_COLLECTION);

  const [total, active, closed, archived] = await Promise.all([
    collection.countDocuments(),
    collection.countDocuments({ status: 'active' }),
    collection.countDocuments({ status: 'closed' }),
    collection.countDocuments({ status: 'archived' }),
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
    categoryCounts,
    lastUpdated: new Date(),
  };
}
