import { z } from 'zod';
import { USER_ROLES, AGENT_TYPES, CONNECTOR_TYPES } from './constants';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const createClientSchema = z.object({
  name: z.string().min(1, 'Client name is required').max(255),
  domains: z.array(z.string().url('Invalid domain URL')).default([]),
  industry: z.string().min(1, 'Industry is required').max(100),
  goalsText: z.string().nullable().optional(),
  nuanceText: z.string().nullable().optional(),
  blacklist: z.array(z.string()).default([]),
});

export const updateClientSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  domains: z.array(z.string()).optional(),
  industry: z.string().min(1).max(100).optional(),
  goalsText: z.string().nullable().optional(),
  nuanceText: z.string().nullable().optional(),
  blacklist: z.array(z.string()).optional(),
});

export const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(255),
  role: z.enum(USER_ROLES),
  assignClientIds: z.array(z.string().uuid()).default([]),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(USER_ROLES),
});

export const agentConfigUpdateSchema = z.object({
  model: z.string().min(1),
  systemPrompt: z.string().optional(),
});

export const connectorCredentialSchema = z.object({
  connectorType: z.enum(CONNECTOR_TYPES),
  credentials: z.record(z.string(), z.unknown()),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type AgentConfigUpdateInput = z.infer<typeof agentConfigUpdateSchema>;
export type ConnectorCredentialInput = z.infer<typeof connectorCredentialSchema>;
