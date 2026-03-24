import crypto from 'crypto';
import { TrendCategory } from '@prisma/client';
import { prisma } from './prisma';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY || '';
const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';

interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  age?: string;
}

interface BraveWebResult {
  title: string;
  url: string;
  description: string;
  age?: string;
}

interface BraveSearchResponse {
  web?: {
    results?: BraveWebResult[];
  };
}

/**
 * Search Brave for trend signals on a given query.
 * Returns raw results for display or further processing.
 */
export async function searchBrave(query: string, count = 10): Promise<BraveSearchResult[]> {
  if (!BRAVE_API_KEY) {
    console.warn('BRAVE_API_KEY not set — Brave Search unavailable');
    return [];
  }

  const params = new URLSearchParams({
    q: query,
    count: String(count),
    freshness: 'pw', // past week
    text_decorations: 'false',
  });

  const response = await fetch(`${BRAVE_SEARCH_URL}?${params}`, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as BraveSearchResponse;
  const results = data.web?.results || [];

  return results.map((r) => ({
    title: r.title || '',
    url: r.url || '',
    description: r.description || '',
    age: r.age,
  }));
}

/**
 * Search Brave and store new results as TrendItems (deduped by URL hash).
 */
export async function searchAndStoreTrends(
  orgId: string,
  query: string,
  category: TrendCategory,
  count = 10,
): Promise<{ results: BraveSearchResult[]; newItems: number }> {
  const results = await searchBrave(query, count);
  let newItems = 0;

  for (const result of results) {
    if (!result.url || !result.title) continue;

    const urlHash = crypto.createHash('sha256').update(result.url.trim().toLowerCase()).digest('hex');

    const existing = await prisma.trendItem.findUnique({ where: { urlHash } });
    if (existing) continue;

    await prisma.trendItem.create({
      data: {
        orgId,
        urlHash,
        url: result.url,
        title: result.title,
        summary: result.description.slice(0, 500),
        category,
        source: 'Brave Search',
        publishedAt: null,
      },
    });
    newItems++;
  }

  return { results, newItems };
}
