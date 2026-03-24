import { ConnectorType, NormalizedData, ConnectorInfo, ConnectorFieldDef } from '@gr-bi/shared';

export interface ConnectorCredentials {
  [key: string]: unknown;
}

export interface ConnectorPullOptions {
  clientId: string;
  dateRangeStart: string;
  dateRangeEnd: string;
}

export interface Connector {
  type: ConnectorType;
  info: ConnectorInfo;
  verify(credentials: ConnectorCredentials): Promise<boolean>;
  pull(credentials: ConnectorCredentials, options: ConnectorPullOptions): Promise<NormalizedData>;
}

export const CONNECTOR_REGISTRY: Record<string, ConnectorInfo> = {};

export function registerConnector(connector: Connector): void {
  CONNECTOR_REGISTRY[connector.type] = connector.info;
}
