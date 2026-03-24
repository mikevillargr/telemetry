import { Router, Request, Response } from 'express';
import { authenticate, requireClientAccess } from '../middleware/auth';
import { sendSuccess, sendError } from '../lib/response';
import { prisma } from '../lib/prisma';
import { decrypt } from '../lib/encryption';
import { chunkText } from '../lib/chunker';
import { storeChunks } from '../lib/rag';

const router = Router();
router.use(authenticate);

const SEMRUSH_API_BASE = 'https://api.semrush.com';

interface SemrushCredentials {
  apiKey: string;
  domain: string;
  database: string;
}

/**
 * Resolve the Semrush API key and domain for a client.
 * Tries encrypted credentials first, falls back to env key + client domain.
 */
async function resolveSemrushCreds(clientId: string): Promise<SemrushCredentials | null> {
  // Try stored connector credentials
  const cred = await prisma.connectorCredential.findFirst({
    where: { clientId, connectorType: 'semrush' },
  });

  if (cred) {
    try {
      const decrypted = JSON.parse(decrypt(cred.credentialsEncrypted));
      return {
        apiKey: decrypted.apiKey || process.env.SEMRUSH_API_KEY || '',
        domain: decrypted.domain || '',
        database: decrypted.database || 'us',
      };
    } catch { /* fall through */ }
  }

  // Fallback: env key + client's first domain
  const envKey = process.env.SEMRUSH_API_KEY;
  if (!envKey) return null;

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { domains: true } });
  const domain = client?.domains?.[0];
  if (!domain) return null;

  return { apiKey: envKey, domain, database: 'us' };
}

// GET /api/semrush/:clientId/keywords — keyword rankings for a client
router.get('/:clientId/keywords', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;
    const sort = (req.query.sort as string) || 'traffic';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    // Try to get from most recent semrush data pull
    const latestPull = await prisma.dataPull.findFirst({
      where: { clientId, connectorType: 'semrush', status: 'success' },
      orderBy: { completedAt: 'desc' },
    });

    if (latestPull?.resultJson) {
      const data = latestPull.resultJson as { rows?: Array<{ date: string; dimensions: Record<string, string>; metrics: Record<string, number> }> };
      const rows = (data.rows || [])
        .sort((a, b) => (b.metrics[sort] || 0) - (a.metrics[sort] || 0))
        .slice(0, limit);

      const keywords = rows.map((r) => ({
        keyword: r.dimensions.keyword,
        position: r.metrics.position,
        previousPosition: r.metrics.previousPosition,
        delta: (r.metrics.previousPosition || r.metrics.position) - r.metrics.position,
        searchVolume: r.metrics.searchVolume,
        cpc: r.metrics.cpc,
        traffic: r.metrics.traffic,
        trafficCost: r.metrics.trafficCost,
        competition: r.metrics.competition,
        url: r.dimensions.url,
        serpFeatures: r.dimensions.serpFeatures ? r.dimensions.serpFeatures.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      }));

      sendSuccess(res, {
        keywords,
        total: (data.rows || []).length,
        pulledAt: latestPull.completedAt,
        source: (latestPull.resultJson as Record<string, unknown>)?.metadata
          ? ((latestPull.resultJson as Record<string, Record<string, unknown>>).metadata?.source || 'semrush')
          : 'semrush',
      });
      return;
    }

    // No data pull yet — try live fetch
    const creds = await resolveSemrushCreds(clientId);
    if (!creds) {
      sendSuccess(res, { keywords: [], total: 0, pulledAt: null, source: 'none', message: 'No Semrush credentials configured. Add them in Client Settings > Connected Sources.' });
      return;
    }

    // Generate mock data based on domain
    const mockKeywords = generateMockKeywords(creds.domain, limit);
    sendSuccess(res, {
      keywords: mockKeywords,
      total: mockKeywords.length,
      pulledAt: new Date().toISOString(),
      source: 'semrush-mock',
    });
  } catch (error) {
    console.error('Semrush keywords error:', error);
    sendError(res, 'Failed to fetch keyword data', 500);
  }
});

// GET /api/semrush/:clientId/competitors — competitive intelligence
router.get('/:clientId/competitors', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;

    const creds = await resolveSemrushCreds(clientId);
    const domain = creds?.domain || 'example.com';

    // In production: call Semrush domain_organic_organic (competitors) API
    // For now: return mock competitive data
    const competitors = generateMockCompetitors(domain);

    sendSuccess(res, {
      domain,
      competitors,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Semrush competitors error:', error);
    sendError(res, 'Failed to fetch competitor data', 500);
  }
});

// GET /api/semrush/:clientId/overview — domain overview metrics
router.get('/:clientId/overview', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;

    const creds = await resolveSemrushCreds(clientId);
    const domain = creds?.domain || 'example.com';

    // In production: call Semrush domain_ranks API
    // For now: return mock overview data
    const overview = generateMockOverview(domain);

    sendSuccess(res, overview);
  } catch (error) {
    console.error('Semrush overview error:', error);
    sendError(res, 'Failed to fetch domain overview', 500);
  }
});

// POST /api/semrush/:clientId/store-rag — store latest Semrush data in RAG for Strategy Agent
router.post('/:clientId/store-rag', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;

    // Get latest semrush data pull
    const latestPull = await prisma.dataPull.findFirst({
      where: { clientId, connectorType: 'semrush', status: 'success' },
      orderBy: { completedAt: 'desc' },
    });

    if (!latestPull?.resultJson) {
      sendError(res, 'No Semrush data available. Run a data pull first.', 400);
      return;
    }

    const data = latestPull.resultJson as { rows?: Array<{ dimensions: Record<string, string>; metrics: Record<string, number> }> };
    const rows = data.rows || [];

    // Build a narrative summary for RAG
    const topKeywords = rows
      .sort((a, b) => (b.metrics.traffic || 0) - (a.metrics.traffic || 0))
      .slice(0, 20);

    const improving = rows.filter((r) => r.metrics.previousPosition > r.metrics.position);
    const declining = rows.filter((r) => r.metrics.previousPosition < r.metrics.position && r.metrics.previousPosition > 0);
    const aiOverviewKws = rows.filter((r) => r.dimensions.serpFeatures?.includes('AI Overview'));

    const narrative = `## Semrush Keyword Rankings Summary
**Date:** ${latestPull.completedAt?.toISOString().split('T')[0] || 'recent'}
**Total Keywords Tracked:** ${rows.length}
**Improving:** ${improving.length} keywords | **Declining:** ${declining.length} keywords

### Top Keywords by Traffic
${topKeywords.map((r, i) => `${i + 1}. "${r.dimensions.keyword}" — Position ${r.metrics.position} (was ${r.metrics.previousPosition}), Volume: ${r.metrics.searchVolume}, Traffic Share: ${r.metrics.traffic}%`).join('\n')}

### AI Overview / SERP Feature Keywords
${aiOverviewKws.length > 0 ? aiOverviewKws.map((r) => `- "${r.dimensions.keyword}" — Position ${r.metrics.position}, Features: ${r.dimensions.serpFeatures}`).join('\n') : 'No keywords with AI Overview detected.'}

### Movement Summary
- **Biggest Gains:** ${improving.sort((a, b) => (b.metrics.previousPosition - b.metrics.position) - (a.metrics.previousPosition - a.metrics.position)).slice(0, 5).map((r) => `"${r.dimensions.keyword}" +${r.metrics.previousPosition - r.metrics.position} positions`).join(', ') || 'None'}
- **Biggest Drops:** ${declining.sort((a, b) => (a.metrics.previousPosition - a.metrics.position) - (b.metrics.previousPosition - b.metrics.position)).slice(0, 5).map((r) => `"${r.dimensions.keyword}" ${r.metrics.previousPosition - r.metrics.position} positions`).join(', ') || 'None'}
`;

    const chunks = chunkText(narrative, 'data_pull', {
      source: 'semrush',
      pullId: latestPull.id,
      keywordCount: rows.length,
    });
    await storeChunks(clientId, chunks, 'data');

    sendSuccess(res, {
      stored: true,
      chunkCount: chunks.length,
      keywordCount: rows.length,
    });
  } catch (error) {
    console.error('Semrush RAG store error:', error);
    sendError(res, 'Failed to store Semrush data in RAG', 500);
  }
});

export default router;

// ── Mock data generators ──

function generateMockKeywords(domain: string, limit: number) {
  const base = domain.split('.')[0];
  const keywords = [
    { kw: `${base} reviews`, vol: 12100, pos: 3, prev: 5, traffic: 8.2, cpc: 2.1, comp: 0.78, serp: ['Featured Snippet', 'Sitelinks'] },
    { kw: `best ${base} alternative`, vol: 8100, pos: 7, prev: 9, traffic: 3.1, cpc: 4.5, comp: 0.82, serp: ['People Also Ask'] },
    { kw: `${base} pricing`, vol: 6600, pos: 1, prev: 1, traffic: 18.5, cpc: 3.8, comp: 0.65, serp: ['Featured Snippet', 'AI Overview'] },
    { kw: `${base} login`, vol: 14800, pos: 1, prev: 1, traffic: 22.1, cpc: 0.5, comp: 0.12, serp: ['Sitelinks'] },
    { kw: `how to use ${base}`, vol: 4400, pos: 4, prev: 6, traffic: 2.8, cpc: 1.2, comp: 0.45, serp: ['Video', 'People Also Ask'] },
    { kw: `${base} vs competitor`, vol: 3600, pos: 12, prev: 8, traffic: 0.9, cpc: 5.2, comp: 0.91, serp: ['AI Overview'] },
    { kw: `${base} features`, vol: 5400, pos: 2, prev: 3, traffic: 12.3, cpc: 2.8, comp: 0.55, serp: ['Sitelinks', 'People Also Ask'] },
    { kw: `${base} demo`, vol: 2900, pos: 1, prev: 2, traffic: 9.8, cpc: 6.1, comp: 0.72, serp: ['Video'] },
    { kw: `${base} integrations`, vol: 1900, pos: 5, prev: 4, traffic: 1.7, cpc: 1.8, comp: 0.38, serp: [] },
    { kw: `${base} api`, vol: 1600, pos: 3, prev: 3, traffic: 3.2, cpc: 2.4, comp: 0.42, serp: [] },
    { kw: `${base} support`, vol: 3200, pos: 2, prev: 2, traffic: 7.4, cpc: 0.8, comp: 0.22, serp: ['Sitelinks'] },
    { kw: `${base} free trial`, vol: 4100, pos: 1, prev: 1, traffic: 15.6, cpc: 7.2, comp: 0.88, serp: ['Featured Snippet'] },
    { kw: 'digital marketing platform', vol: 22000, pos: 18, prev: 22, traffic: 0.4, cpc: 8.5, comp: 0.95, serp: ['AI Overview', 'Featured Snippet'] },
    { kw: 'marketing analytics tool', vol: 9900, pos: 14, prev: 16, traffic: 0.8, cpc: 6.8, comp: 0.89, serp: ['People Also Ask'] },
    { kw: 'seo reporting software', vol: 6600, pos: 9, prev: 11, traffic: 1.5, cpc: 5.4, comp: 0.83, serp: ['AI Overview'] },
  ];

  return keywords.slice(0, limit).map((k) => ({
    keyword: k.kw,
    position: k.pos,
    previousPosition: k.prev,
    delta: k.prev - k.pos,
    searchVolume: k.vol,
    cpc: k.cpc,
    traffic: k.traffic,
    trafficCost: +(k.traffic * k.cpc).toFixed(2),
    competition: k.comp,
    url: `https://${domain}/${k.kw.split(' ').slice(-1)[0]}`,
    serpFeatures: k.serp,
  }));
}

function generateMockCompetitors(domain: string) {
  const base = domain.split('.')[0];
  return [
    { domain: `competitor1-${base}.com`, commonKeywords: 342, organicTraffic: 185000, paidTraffic: 12400, organicKeywords: 8900, adwordsKeywords: 560 },
    { domain: `rival-${base}.com`, commonKeywords: 287, organicTraffic: 142000, paidTraffic: 8200, organicKeywords: 6700, adwordsKeywords: 390 },
    { domain: `alt-${base}.io`, commonKeywords: 198, organicTraffic: 98000, paidTraffic: 15600, organicKeywords: 4300, adwordsKeywords: 820 },
    { domain: `${base}-pro.com`, commonKeywords: 156, organicTraffic: 67000, paidTraffic: 3200, organicKeywords: 3100, adwordsKeywords: 180 },
    { domain: `best${base}.com`, commonKeywords: 124, organicTraffic: 45000, paidTraffic: 1800, organicKeywords: 2200, adwordsKeywords: 95 },
  ];
}

function generateMockOverview(domain: string) {
  return {
    domain,
    organicSearchTraffic: 156000,
    organicSearchTrafficCost: 482000,
    paidSearchTraffic: 12400,
    paidSearchTrafficCost: 34200,
    organicKeywords: 8940,
    paidKeywords: 560,
    backlinks: 145000,
    referringDomains: 3200,
    authorityScore: 62,
    organicTrafficTrend: [
      { month: '2025-10', traffic: 128000 },
      { month: '2025-11', traffic: 135000 },
      { month: '2025-12', traffic: 142000 },
      { month: '2026-01', traffic: 148000 },
      { month: '2026-02', traffic: 152000 },
      { month: '2026-03', traffic: 156000 },
    ],
  };
}
