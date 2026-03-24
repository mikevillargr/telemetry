import { TrendCategory } from '@prisma/client';

export interface RssSource {
  url: string;
  name: string;
  category: TrendCategory;
  shortCode: string; // 1-2 char badge letter
}

/**
 * Curated RSS source library organized by category.
 * These are authoritative industry sources for SEO, paid media, AI visibility, and research.
 */
export const RSS_SOURCES: RssSource[] = [
  // ── SEO ──
  {
    url: 'https://searchengineland.com/feed',
    name: 'Search Engine Land',
    category: 'seo',
    shortCode: 'SE',
  },
  {
    url: 'https://www.seroundtable.com/feed',
    name: 'SE Roundtable',
    category: 'seo',
    shortCode: 'SR',
  },
  {
    url: 'https://moz.com/blog/feed',
    name: 'Moz Blog',
    category: 'seo',
    shortCode: 'M',
  },
  {
    url: 'https://ahrefs.com/blog/feed/',
    name: 'Ahrefs Blog',
    category: 'seo',
    shortCode: 'A',
  },
  {
    url: 'https://developers.google.com/search/blog/rss',
    name: 'Google Search Central',
    category: 'seo',
    shortCode: 'G',
  },

  // ── GEO / AI Visibility ──
  {
    url: 'https://blog.google/technology/ai/rss/',
    name: 'Google AI Blog',
    category: 'geo_ai_visibility',
    shortCode: 'GA',
  },
  {
    url: 'https://openai.com/blog/rss.xml',
    name: 'OpenAI Blog',
    category: 'geo_ai_visibility',
    shortCode: 'O',
  },
  {
    url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
    name: 'The Verge AI',
    category: 'geo_ai_visibility',
    shortCode: 'V',
  },

  // ── Paid Media ──
  {
    url: 'https://blog.google/products/ads-commerce/rss/',
    name: 'Google Ads Blog',
    category: 'paid_media',
    shortCode: 'GA',
  },
  {
    url: 'https://www.socialmediaexaminer.com/feed/',
    name: 'Social Media Examiner',
    category: 'paid_media',
    shortCode: 'SM',
  },
  {
    url: 'https://www.jonloomer.com/feed/',
    name: 'Jon Loomer',
    category: 'paid_media',
    shortCode: 'JL',
  },

  // ── Research ──
  {
    url: 'https://www.semrush.com/blog/feed/',
    name: 'Semrush Blog',
    category: 'research',
    shortCode: 'S',
  },
  {
    url: 'https://www.searchenginejournal.com/feed/',
    name: 'Search Engine Journal',
    category: 'research',
    shortCode: 'SJ',
  },
];

export function getSourcesByCategory(category: TrendCategory): RssSource[] {
  return RSS_SOURCES.filter((s) => s.category === category);
}
