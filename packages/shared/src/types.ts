export type UserRole = 'admin' | 'am' | 'strategist' | 'leadership' | 'client';

export type AgentType = 'data' | 'visualization' | 'strategy' | 'trends';

export type ConnectorType = 'ga4' | 'gsc' | 'meta' | 'semrush' | 'brave' | 'upload';

export type ContentType =
  | 'data_pull'
  | 'report'
  | 'recommendation'
  | 'strategy'
  | 'onboarding_brief'
  | 'trends_digest';

export interface Organization {
  id: string;
  name: string;
  createdAt: Date;
}

export interface User {
  id: string;
  orgId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

export interface Client {
  id: string;
  orgId: string;
  name: string;
  domains: string[];
  industry: string;
  goalsText: string | null;
  nuanceText: string | null;
  blacklist: string[];
  createdAt: Date;
}

export interface ConnectorCredential {
  id: string;
  clientId: string;
  connectorType: ConnectorType;
  credentialsEncrypted: string;
  lastSynced: Date | null;
}

export interface AgentConfig {
  id: string;
  orgId: string;
  agentType: AgentType;
  model: string;
  systemPrompt: string;
  updatedAt: Date;
  updatedBy: string | null;
}

export interface Report {
  id: string;
  clientId: string;
  title: string;
  contentJson: Record<string, unknown>;
  createdByAgent: AgentType | null;
  createdAt: Date;
}

export interface RagDocument {
  id: string;
  clientId: string;
  content: string;
  contentType: ContentType;
  authorAgent: AgentType | null;
  dateRangeStart: Date | null;
  dateRangeEnd: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface AuditLogEntry {
  id: string;
  orgId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  createdAt: Date;
}

export interface JwtPayload {
  userId: string;
  orgId: string;
  role: UserRole;
  assignedClientIds: string[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

export interface AuthUser {
  id: string;
  orgId: string;
  email: string;
  name: string;
  role: UserRole;
  assignedClientIds: string[];
}

// ── Phase 2: Connector types ──

export type PullStatus = 'pending' | 'running' | 'success' | 'error';

export interface PullOptions {
  clientId: string;
  connectorType: ConnectorType;
  dateRangeStart: string;
  dateRangeEnd: string;
}

export interface NormalizedRow {
  date: string;
  dimensions: Record<string, string>;
  metrics: Record<string, number>;
}

export interface NormalizedData {
  connectorType: ConnectorType;
  clientId: string;
  dateRange: { start: string; end: string };
  rows: NormalizedRow[];
  metadata: Record<string, unknown>;
  pulledAt: string;
}

export interface DataPullRecord {
  id: string;
  clientId: string;
  connectorType: ConnectorType;
  status: PullStatus;
  rowCount: number | null;
  error: string | null;
  dateRangeStart: string;
  dateRangeEnd: string;
  startedAt: string;
  completedAt: string | null;
}

export interface ConnectorInfo {
  type: ConnectorType;
  label: string;
  description: string;
  icon: string;
  requiredFields: ConnectorFieldDef[];
}

export interface ConnectorFieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'file' | 'password';
  placeholder?: string;
  helpText?: string;
}
