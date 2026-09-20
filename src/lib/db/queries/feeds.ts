import { eq, sql } from "drizzle-orm";
import { db } from "..";
import { Feed, feeds, users } from "../schema";

export async function createFeed(
  name: string,
  url: string,
  userId: string,
) {
  const [result] = await db
    .insert(feeds)
    .values({
      name,
      url,
      userId,
    })
    .returning();

  return result;
}

export async function getFeeds() {
  return await db
    .select({
      feed: feeds,
      user: users,
    })
    .from(feeds)
    .innerJoin(users, eq(feeds.userId, users.id));
}

export async function getFeedByUrl(url: string) {
  const [result] = await db
    .select()
    .from(feeds)
    .where(eq(feeds.url, url));

  return result;
}

export async function markFeedFetched(feedId: string): Promise<Feed> {
  const [feed] = await db
    .update(feeds)
    .set({
      lastFetchedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(feeds.id, feedId))
    .returning();

  return feed;
}

export async function getNextFeedToFetch(): Promise<Feed> {
  const [feed] = await db
    .select()
    .from(feeds)
    .orderBy(sql`${feeds.lastFetchedAt} ASC NULLS FIRST`)
    .limit(1);

  return feed;
}
