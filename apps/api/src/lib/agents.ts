import { AgentType } from '@gr-bi/shared';
import { prisma } from './prisma';
import { callClaude, ClaudeMessage } from './claude';
import { semanticSearch, RagSearchResult } from './rag';

export interface SuluQuery {
  clientId: string;
  orgId: string;
  query: string;
  agentType?: AgentType;
  conversationHistory?: ClaudeMessage[];
  dateFrom?: string;
  dateTo?: string;
}

export interface AgentResponse {
  agentType: AgentType;
  response: string;
  ragContext: Array<{
    id: string;
    content: string;
    contentType: string;
    similarity: number;
  }>;
  model: string;
  tokensUsed?: number;
}

export interface SuluResponse {
  agents: AgentResponse[];
  query: string;
  clientId: string;
}

const ROUTING_KEYWORDS: Record<AgentType, string[]> = {
  data: [
    'traffic', 'sessions', 'users', 'pageviews', 'bounce', 'conversion',
    'clicks', 'impressions', 'ctr', 'revenue', 'metrics', 'data', 'numbers',
    'analytics', 'ga4', 'gsc', 'performance', 'how many', 'what was', 'compare',
  ],
  strategy: [
    'recommend', 'strategy', 'improve', 'optimize', 'suggest', 'action',
    'plan', 'budget', 'roi', 'next steps', 'should we', 'opportunity',
    'competitive', 'growth', 'prioritize',
  ],
  trends: [
    'trend', 'change', 'update', 'algorithm', 'shift', 'market',
    'industry', 'news', 'impact', 'emerging', 'forecast', 'predict',
    'pattern', 'anomaly', 'spike', 'drop',
  ],
  visualization: [
    'chart', 'graph', 'plot', 'visualize', 'dashboard', 'display',
    'show me', 'bar chart', 'line chart', 'pie chart', 'table',
  ],
};

/**
 * Route a query to the most relevant agent(s) based on keyword matching.
 * Returns the primary agent and optionally a secondary agent.
 */
function routeQuery(query: string): AgentType[] {
  const lower = query.toLowerCase();
  const scores: Record<AgentType, number> = {
    data: 0,
    strategy: 0,
    trends: 0,
    visualization: 0,
  };

  for (const [agent, keywords] of Object.entries(ROUTING_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        scores[agent as AgentType] += 1;
      }
    }
  }

  // Sort by score descending
  const sorted = (Object.entries(scores) as [AgentType, number][])
    .sort((a, b) => b[1] - a[1]);

  // If no keywords matched, default to data agent
  if (sorted[0][1] === 0) return ['data'];

  // Return primary agent; include secondary if it also scored well
  const primary = sorted[0][0];
  const agents: AgentType[] = [primary];

  if (sorted[1][1] > 0 && sorted[1][1] >= sorted[0][1] * 0.5) {
    agents.push(sorted[1][0]);
  }

  return agents;
}

/**
 * Get agent config (model + system prompt) from DB, with fallbacks.
 */
async function getAgentConfig(
  orgId: string,
  agentType: AgentType,
): Promise<{ model: string; systemPrompt: string }> {
  const config = await prisma.agentConfig.findUnique({
    where: { orgId_agentType: { orgId, agentType } },
  });

  return {
    model: config?.model || 'claude-sonnet-4-6',
    systemPrompt: config?.systemPrompt || `You are the ${agentType} agent for Growth Rocket BI.`,
  };
}

/**
 * Build the context-enriched user message by prepending RAG results.
 */
function buildContextMessage(
  query: string,
  ragResults: RagSearchResult[],
  clientName: string,
): string {
  const parts: string[] = [];

  parts.push(`Client: ${clientName}`);

  if (ragResults.length > 0) {
    parts.push('');
    parts.push('=== Relevant Data Context ===');
    for (const result of ragResults) {
      parts.push(`[${result.contentType} | similarity: ${Number(result.similarity).toFixed(3)}]`);
      parts.push(result.content);
      parts.push('---');
    }
    parts.push('=== End Context ===');
  }

  parts.push('');
  parts.push(`User Query: ${query}`);

  return parts.join('\n');
}

/**
 * Execute a single agent: fetch RAG context, build prompt, call Claude.
 */
async function executeAgent(
  agentType: AgentType,
  suluQuery: SuluQuery,
  clientName: string,
): Promise<AgentResponse> {
  // 1. Get agent config
  const config = await getAgentConfig(suluQuery.orgId, agentType);

  // 2. Search RAG for relevant context
  const contentTypeMap: Record<AgentType, string[] | undefined> = {
    data: ['data_pull'],
    strategy: ['data_pull', 'strategy', 'recommendation'],
    trends: ['data_pull', 'trends_digest'],
    visualization: ['data_pull'],
  };

  const ragResults = await semanticSearch(suluQuery.clientId, suluQuery.query, {
    limit: 5,
    contentTypes: contentTypeMap[agentType],
    dateFrom: suluQuery.dateFrom,
    dateTo: suluQuery.dateTo,
    minSimilarity: 0.2,
  });

  // 3. Build messages with RAG context
  const contextMessage = buildContextMessage(suluQuery.query, ragResults, clientName);

  const messages: ClaudeMessage[] = [
    ...(suluQuery.conversationHistory || []),
    { role: 'user', content: contextMessage },
  ];

  // 4. Call Claude
  const response = await callClaude({
    model: config.model,
    systemPrompt: config.systemPrompt,
    messages,
    maxTokens: 4096,
    temperature: 0.7,
  });

  return {
    agentType,
    response,
    ragContext: ragResults.map((r) => ({
      id: r.id,
      content: r.content.slice(0, 200),
      contentType: r.contentType,
      similarity: Number(r.similarity),
    })),
    model: config.model,
  };
}

/**
 * Main Sulu query handler: routes to agent(s), executes in parallel, returns responses.
 */
export async function querySulu(suluQuery: SuluQuery): Promise<SuluResponse> {
  // Determine which agents to invoke
  const agentTypes = suluQuery.agentType
    ? [suluQuery.agentType]
    : routeQuery(suluQuery.query);

  // Get client name for context
  const client = await prisma.client.findUnique({
    where: { id: suluQuery.clientId },
    select: { name: true },
  });
  const clientName = client?.name || 'Unknown Client';

  // Execute agents in parallel
  const agentPromises = agentTypes.map((agentType) =>
    executeAgent(agentType, suluQuery, clientName),
  );

  const agents = await Promise.all(agentPromises);

  return {
    agents,
    query: suluQuery.query,
    clientId: suluQuery.clientId,
  };
}
