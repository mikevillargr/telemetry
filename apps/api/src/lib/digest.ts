import { TrendCategory } from '@prisma/client';
import { prisma } from './prisma';
import { querySulu } from './agents';
import { chunkText } from './chunker';
import { storeChunks } from './rag';

interface DigestResult {
  digest: string;
  trendCount: number;
  storedInRag: boolean;
}

const CATEGORY_LABELS: Record<TrendCategory, string> = {
  seo: 'SEO',
  geo_ai_visibility: 'GEO/AI Visibility',
  paid_media: 'Paid Media',
  research: 'Research',
};

/**
 * Generate an AI-powered digest from recent trend items.
 * Uses the Trends Agent to synthesize a narrative, then stores in RAG.
 */
export async function generateDigest(
  orgId: string,
  frequency: 'daily' | 'weekly' | 'monthly',
): Promise<DigestResult> {
  // Determine lookback window based on frequency
  const now = new Date();
  const lookbackDays = frequency === 'daily' ? 1 : frequency === 'weekly' ? 7 : 30;
  const since = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  // Fetch recent trend items
  const trends = await prisma.trendItem.findMany({
    where: {
      orgId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  if (trends.length === 0) {
    return { digest: 'No new trends found in this period.', trendCount: 0, storedInRag: false };
  }

  // Build prompt from trend items
  const trendSummaries = trends.map((t, i) => {
    const cat = CATEGORY_LABELS[t.category] || t.category;
    return `${i + 1}. [${cat}] ${t.title}\n   Source: ${t.source}\n   ${t.summary}`;
  }).join('\n\n');

  const prompt = `You are generating a ${frequency} intelligence digest for a digital marketing agency. Below are the latest ${trends.length} trend items from the past ${lookbackDays} day(s).

Synthesize these into a structured intelligence digest with the following sections:
1. **Executive Summary** — 2-3 sentence overview of the most important developments
2. **Key Developments by Category** — Group notable items under SEO, GEO/AI Visibility, Paid Media, and Research
3. **Action Items** — Specific recommendations for agency clients based on these trends
4. **Watch List** — Emerging signals that deserve monitoring

Be concise, data-driven, and actionable. Use markdown formatting.

--- TREND ITEMS ---
${trendSummaries}`;

  // Get the first org client for RAG context (digest is org-wide)
  const orgClients = await prisma.client.findMany({
    where: { orgId },
    take: 1,
  });

  const clientId = orgClients[0]?.id;
  if (!clientId) {
    return { digest: 'No clients found for this organization.', trendCount: trends.length, storedInRag: false };
  }

  // Use the Trends Agent to generate the digest
  const response = await querySulu({
    clientId,
    orgId,
    query: prompt,
    agentType: 'trends',
  });

  const trendsAgent = response.agents.find((a) => a.agentType === 'trends');
  const digest = trendsAgent?.response || 'Digest generation failed — no agent response.';

  // Store digest in RAG
  let storedInRag = false;
  try {
    const chunks = chunkText(digest, 'trends_digest', {
      frequency,
      generatedAt: now.toISOString(),
      trendCount: trends.length,
    });
    await storeChunks(clientId, chunks, 'trends');
    storedInRag = true;
  } catch (err) {
    console.error('Failed to store digest in RAG:', err);
  }

  // Update last run time on digest schedule
  await prisma.digestSchedule.upsert({
    where: { orgId },
    update: { lastRunAt: now },
    create: { orgId, frequency, lastRunAt: now },
  });

  return { digest, trendCount: trends.length, storedInRag };
}
