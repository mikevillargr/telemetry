import { NormalizedData } from '@gr-bi/shared';
import { Connector, ConnectorCredentials, ConnectorPullOptions } from './base';

export const gscConnector: Connector = {
  type: 'gsc',
  info: {
    type: 'gsc',
    label: 'Google Search Console',
    description: 'Connect to GSC for search queries, impressions, clicks, and position data.',
    icon: 'Search',
    requiredFields: [
      {
        key: 'siteUrl',
        label: 'Site URL',
        type: 'text',
        placeholder: 'e.g. https://example.com',
        helpText: 'Must match the property in Search Console',
      },
      {
        key: 'serviceAccountJson',
        label: 'Service Account JSON',
        type: 'textarea',
        placeholder: 'Paste service account key JSON...',
        helpText: 'Same service account as GA4 or a separate one with GSC access',
      },
    ],
  },

  async verify(credentials: ConnectorCredentials): Promise<boolean> {
    const { siteUrl, serviceAccountJson } = credentials;
    if (!siteUrl || !serviceAccountJson) return false;
    // In production: verify service account + GSC access
    // For dev: accept any non-empty credentials
    return true;
  },

  async pull(credentials: ConnectorCredentials, options: ConnectorPullOptions): Promise<NormalizedData> {
    const { siteUrl } = credentials;
    const days = daysBetween(options.dateRangeStart, options.dateRangeEnd);
    const rows = generateMockGSCData(days, options.dateRangeStart);

    return {
      connectorType: 'gsc',
      clientId: options.clientId,
      dateRange: { start: options.dateRangeStart, end: options.dateRangeEnd },
      rows,
      metadata: { siteUrl, source: 'gsc-mock' },
      pulledAt: new Date().toISOString(),
    };
  },
};

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
}

function generateMockGSCData(days: number, startDate: string) {
  const rows = [];
  const queries = [
    'brand name', 'product reviews', 'best solutions 2025', 'how to guide',
    'competitor comparison', 'pricing page', 'free trial', 'case study',
    'tutorial beginner', 'industry trends',
  ];
  const base = new Date(startDate);

  for (let d = 0; d < days; d++) {
    const date = new Date(base);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().slice(0, 10);

    for (const query of queries.slice(0, 5 + Math.floor(Math.random() * 5))) {
      rows.push({
        date: dateStr,
        dimensions: { query, page: `/blog/${query.replace(/\s+/g, '-')}` },
        metrics: {
          clicks: Math.floor(10 + Math.random() * 90),
          impressions: Math.floor(200 + Math.random() * 800),
          ctr: Math.round((2 + Math.random() * 8) * 100) / 100,
          position: Math.round((3 + Math.random() * 20) * 10) / 10,
        },
      });
    }
  }
  return rows;
}
