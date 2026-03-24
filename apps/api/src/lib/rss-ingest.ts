import RssParser from 'rss-parser';
import crypto from 'crypto';
import { TrendCategory } from '@prisma/client';
import { prisma } from './prisma';
import { RSS_SOURCES, RssSource } from './rss-sources';

const parser = new RssParser({
  timeout: 10_000,
  headers: { 'User-Agent': 'GrowthRocketBI/1.0 RSS Aggregator' },
});

interface IngestResult {
  totalFetched: number;
  newItems: number;
  duplicates: number;
  errors: string[];
}

/**
 * Hash a URL to a deterministic string for dedup.
 */
function hashUrl(url: string): string {
  return crypto.createHash('sha256').update(url.trim().toLowerCase()).digest('hex');
}

/**
 * Ingest RSS items from a single source.
 */
async function ingestSource(source: RssSource, orgId: string): Promise<{ fetched: number; inserted: number; errors: string[] }> {
  const errors: string[] = [];
  let fetched = 0;
  let inserted = 0;

  try {
    const feed = await parser.parseURL(source.url);
    const items = (feed.items || []).slice(0, 20); // cap at 20 per feed
    fetched = items.length;

    for (const item of items) {
      const link = item.link || item.guid || '';
      if (!link) continue;

      const urlHash = hashUrl(link);

      // Skip if already exists (dedup by URL hash)
      const existing = await prisma.trendItem.findUnique({ where: { urlHash } });
      if (existing) continue;

      const title = (item.title || '').trim();
      if (!title) continue;

      const summary = (item.contentSnippet || item.content || '')
        .replace(/<[^>]*>/g, '') // strip HTML
        .trim()
        .slice(0, 500);

      const publishedAt = item.pubDate ? new Date(item.pubDate) : null;

      await prisma.trendItem.create({
        data: {
          orgId,
          urlHash,
          url: link,
          title,
          summary,
          category: source.category,
          source: source.name,
          publishedAt,
        },
      });
      inserted++;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`${source.name}: ${msg}`);
  }

  return { fetched, inserted, errors };
}

/**
 * Ingest all RSS sources for an org. Deduplicates by URL hash.
 * Optionally filter to a specific category.
 */
export async function ingestAllFeeds(
  orgId: string,
  category?: TrendCategory,
): Promise<IngestResult> {
  const sources = category
    ? RSS_SOURCES.filter((s) => s.category === category)
    : RSS_SOURCES;

  let totalFetched = 0;
  let newItems = 0;
  const allErrors: string[] = [];

  const results = await Promise.allSettled(
    sources.map((source) => ingestSource(source, orgId)),
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      totalFetched += result.value.fetched;
      newItems += result.value.inserted;
      allErrors.push(...result.value.errors);
    } else {
      allErrors.push(result.reason?.message || 'Unknown error');
    }
  }

  const duplicates = totalFetched - newItems;

  console.log(
    `RSS ingest complete: ${totalFetched} fetched, ${newItems} new, ${duplicates} dupes, ${allErrors.length} errors`,
  );

  return { totalFetched, newItems, duplicates, errors: allErrors };
}
