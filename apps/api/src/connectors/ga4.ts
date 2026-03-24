import { NormalizedData } from '@gr-bi/shared';
import { Connector, ConnectorCredentials, ConnectorPullOptions } from './base';

export const ga4Connector: Connector = {
  type: 'ga4',
  info: {
    type: 'ga4',
    label: 'Google Analytics 4',
    description: 'Connect to GA4 via service account for traffic, conversions, and engagement data.',
    icon: 'BarChart3',
    requiredFields: [
      {
        key: 'propertyId',
        label: 'GA4 Property ID',
        type: 'text',
        placeholder: 'e.g. 123456789',
        helpText: 'Found in GA4 Admin > Property Settings',
      },
      {
        key: 'serviceAccountJson',
        label: 'Service Account JSON',
        type: 'textarea',
        placeholder: 'Paste service account key JSON...',
        helpText: 'Download from Google Cloud Console > IAM > Service Accounts',
      },
    ],
  },

  async verify(credentials: ConnectorCredentials): Promise<boolean> {
    const { propertyId, serviceAccountJson } = credentials;
    if (!propertyId || !serviceAccountJson) return false;

    // In production: use google-auth-library to verify service account
    // and make a test runReport call to GA4 Data API v1
    // For dev: accept any non-empty credentials
    return true;
  },

  async pull(credentials: ConnectorCredentials, options: ConnectorPullOptions): Promise<NormalizedData> {
    const { propertyId } = credentials;

    // In production: use @google-analytics/data to call runReport
    // For Phase 2 scaffold: return realistic mock data
    const days = daysBetween(options.dateRangeStart, options.dateRangeEnd);
    const rows = generateMockGA4Data(days, options.dateRangeStart);

    return {
      connectorType: 'ga4',
      clientId: options.clientId,
      dateRange: { start: options.dateRangeStart, end: options.dateRangeEnd },
      rows,
      metadata: { propertyId, source: 'ga4-mock' },
      pulledAt: new Date().toISOString(),
    };
  },
};

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
}

function generateMockGA4Data(days: number, startDate: string) {
  const rows = [];
  const channels = ['organic', 'direct', 'social', 'email', 'referral', 'paid_search'];
  const base = new Date(startDate);

  for (let d = 0; d < days; d++) {
    const date = new Date(base);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().slice(0, 10);

    for (const channel of channels) {
      const multiplier = channel === 'organic' ? 3 : channel === 'direct' ? 2 : 1;
      rows.push({
        date: dateStr,
        dimensions: { channel, deviceCategory: Math.random() > 0.5 ? 'desktop' : 'mobile' },
        metrics: {
          sessions: Math.floor(100 * multiplier + Math.random() * 50 * multiplier),
          users: Math.floor(80 * multiplier + Math.random() * 40 * multiplier),
          pageviews: Math.floor(200 * multiplier + Math.random() * 100 * multiplier),
          bounceRate: Math.round((30 + Math.random() * 30) * 100) / 100,
          avgSessionDuration: Math.round((60 + Math.random() * 180) * 100) / 100,
          conversions: Math.floor(5 * multiplier + Math.random() * 10),
          conversionRate: Math.round((1 + Math.random() * 4) * 100) / 100,
        },
      });
    }
  }
  return rows;
}
