import { ConnectorType } from '@gr-bi/shared';
import { Connector, CONNECTOR_REGISTRY, registerConnector } from './base';
import { ga4Connector } from './ga4';
import { gscConnector } from './gsc';
import { metaConnector } from './meta';
import { uploadConnector } from './upload';
import { semrushConnector } from './semrush';

const connectors: Record<string, Connector> = {
  ga4: ga4Connector,
  gsc: gscConnector,
  meta: metaConnector,
  upload: uploadConnector,
  semrush: semrushConnector,
};

// Register all connectors
Object.values(connectors).forEach(registerConnector);

export function getConnector(type: ConnectorType): Connector | undefined {
  return connectors[type];
}

export function getAllConnectorInfo() {
  return Object.values(CONNECTOR_REGISTRY);
}

export { CONNECTOR_REGISTRY };
