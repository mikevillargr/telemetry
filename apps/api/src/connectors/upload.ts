import { NormalizedData } from '@gr-bi/shared';
import { Connector, ConnectorCredentials, ConnectorPullOptions } from './base';

export const uploadConnector: Connector = {
  type: 'upload',
  info: {
    type: 'upload',
    label: 'Manual Upload',
    description: 'Upload CSV or Excel files with custom data. Data is parsed and normalized automatically.',
    icon: 'Upload',
    requiredFields: [
      {
        key: 'description',
        label: 'Data Description',
        type: 'text',
        placeholder: 'e.g. Monthly sales report',
        helpText: 'Describe what this data represents',
      },
    ],
  },

  async verify(_credentials: ConnectorCredentials): Promise<boolean> {
    // Upload connector is always valid — no external auth needed
    return true;
  },

  async pull(_credentials: ConnectorCredentials, options: ConnectorPullOptions): Promise<NormalizedData> {
    // In production: parse uploaded CSV/Excel from request body
    // For Phase 2 scaffold: return empty normalized structure
    return {
      connectorType: 'upload',
      clientId: options.clientId,
      dateRange: { start: options.dateRangeStart, end: options.dateRangeEnd },
      rows: [],
      metadata: { source: 'manual-upload' },
      pulledAt: new Date().toISOString(),
    };
  },
};
