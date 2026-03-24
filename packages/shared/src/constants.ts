export const USER_ROLES = ['admin', 'am', 'strategist', 'leadership', 'client'] as const;

export const AGENT_TYPES = ['data', 'visualization', 'strategy', 'trends'] as const;

export const CONNECTOR_TYPES = ['ga4', 'gsc', 'meta', 'semrush', 'brave', 'upload'] as const;

export const CONTENT_TYPES = [
  'data_pull',
  'report',
  'recommendation',
  'strategy',
  'onboarding_brief',
  'trends_digest',
] as const;

export const AGENT_COLORS: Record<string, string> = {
  data: '#E8450A',
  visualization: '#3B82F6',
  strategy: '#10B981',
  trends: '#8B5CF6',
};

export const AGENT_DEFAULT_MODELS: Record<string, string> = {
  data: 'claude-haiku-4-5-20251001',
  visualization: 'claude-sonnet-4-6',
  strategy: 'claude-sonnet-4-6',
  trends: 'claude-sonnet-4-6',
};

export const AVAILABLE_MODELS = [
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
] as const;

export const THEME = {
  background: '#0A0A0F',
  surface: '#111118',
  border: '#1E1E2E',
  accentOrange: '#E8450A',
  accentBlue: '#3B82F6',
  accentGreen: '#10B981',
  accentPurple: '#8B5CF6',
  textPrimary: '#F1F5F9',
  textMuted: '#6B7280',
} as const;
