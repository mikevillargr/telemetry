import { NormalizedData } from '@gr-bi/shared';
import { Connector, ConnectorCredentials, ConnectorPullOptions } from './base';

export const metaConnector: Connector = {
  type: 'meta',
  info: {
    type: 'meta',
    label: 'Meta Ads',
    description: 'Connect to Meta Marketing API for ad spend, reach, impressions, and conversion data.',
    icon: 'Megaphone',
    requiredFields: [
      {
        key: 'accessToken',
        label: 'Access Token',
        type: 'password',
        placeholder: 'Long-lived access token',
        helpText: 'Generate from Meta Business Suite > System Users',
      },
      {
        key: 'adAccountId',
        label: 'Ad Account ID',
        type: 'text',
        placeholder: 'e.g. act_123456789',
        helpText: 'Found in Meta Business Settings > Ad Accounts',
      },
    ],
  },

  async verify(credentials: ConnectorCredentials): Promise<boolean> {
    const { accessToken, adAccountId } = credentials;
    if (!accessToken || !adAccountId) return false;
    // In production: call /me?access_token=... to verify token
    // For dev: accept any non-empty credentials
    return true;
  },

  async pull(credentials: ConnectorCredentials, options: ConnectorPullOptions): Promise<NormalizedData> {
    const { adAccountId } = credentials;
    const days = daysBetween(options.dateRangeStart, options.dateRangeEnd);
    const rows = generateMockMetaData(days, options.dateRangeStart);

    return {
      connectorType: 'meta',
      clientId: options.clientId,
      dateRange: { start: options.dateRangeStart, end: options.dateRangeEnd },
      rows,
      metadata: { adAccountId, source: 'meta-mock' },
      pulledAt: new Date().toISOString(),
    };
  },
};

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
}

function generateMockMetaData(days: number, startDate: string) {
  const rows = [];
  const campaigns = ['Brand Awareness', 'Lead Gen', 'Retargeting', 'Conversions'];
  const base = new Date(startDate);

  for (let d = 0; d < days; d++) {
    const date = new Date(base);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().slice(0, 10);

    for (const campaign of campaigns) {
      const spendBase = campaign === 'Conversions' ? 150 : campaign === 'Lead Gen' ? 100 : 60;
      rows.push({
        date: dateStr,
        dimensions: { campaignName: campaign, objective: campaign.toLowerCase().replace(/\s/g, '_') },
        metrics: {
          spend: Math.round((spendBase + Math.random() * spendBase * 0.4) * 100) / 100,
          impressions: Math.floor(5000 + Math.random() * 10000),
          reach: Math.floor(3000 + Math.random() * 7000),
          clicks: Math.floor(50 + Math.random() * 200),
          ctr: Math.round((0.5 + Math.random() * 2) * 100) / 100,
          cpc: Math.round((0.5 + Math.random() * 2) * 100) / 100,
          conversions: Math.floor(2 + Math.random() * 15),
          costPerConversion: Math.round((10 + Math.random() * 30) * 100) / 100,
        },
      });
    }
  }
  return rows;
}
