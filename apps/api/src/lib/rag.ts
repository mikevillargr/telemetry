import { prisma } from './prisma';
import { generateEmbedding, generateEmbeddings, vectorToSql } from './embeddings';
import { DocumentChunk } from './chunker';
import { Prisma } from '@prisma/client';

export interface RagSearchResult {
  id: string;
  clientId: string;
  content: string;
  contentType: string;
  authorAgent: string | null;
  dateRangeStart: Date | null;
  dateRangeEnd: Date | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  similarity: number;
}

/**
 * Store an array of document chunks with their embeddings.
 * Generates embeddings in batch and inserts via raw SQL (Prisma can't write Unsupported columns).
 */
export async function storeChunks(
  clientId: string,
  chunks: DocumentChunk[],
  authorAgent?: 'data' | 'visualization' | 'strategy' | 'trends',
): Promise<{ stored: number }> {
  if (chunks.length === 0) return { stored: 0 };

  // Generate embeddings in batch
  const texts = chunks.map((c) => c.content);
  const embeddings = await generateEmbeddings(texts);

  // Insert each chunk via raw SQL (needed for vector column)
  let stored = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddings[i];

    await prisma.$executeRaw`
      INSERT INTO rag_documents (id, client_id, content, embedding, content_type, author_agent, date_range_start, date_range_end, metadata, created_at)
      VALUES (
        gen_random_uuid(),
        ${clientId},
        ${chunk.content},
        ${vectorToSql(embedding)}::vector,
        ${chunk.contentType}::"content_type",
        ${authorAgent ?? null}::"agent_type",
        ${chunk.dateRangeStart ? new Date(chunk.dateRangeStart) : null}::timestamptz,
        ${chunk.dateRangeEnd ? new Date(chunk.dateRangeEnd) : null}::timestamptz,
        ${JSON.stringify(chunk.metadata)}::jsonb,
        NOW()
      )
    `;
    stored++;
  }

  return { stored };
}

/**
 * Semantic search: embed the query, find top-K similar documents for a client.
 */
export async function semanticSearch(
  clientId: string,
  query: string,
  options: {
    limit?: number;
    contentTypes?: string[];
    dateFrom?: string;
    dateTo?: string;
    minSimilarity?: number;
  } = {},
): Promise<RagSearchResult[]> {
  const {
    limit = 10,
    contentTypes,
    dateFrom,
    dateTo,
    minSimilarity = 0.3,
  } = options;

  const queryEmbedding = await generateEmbedding(query);
  const vectorStr = vectorToSql(queryEmbedding);

  // Build dynamic WHERE clauses
  const conditions: string[] = [`client_id = '${clientId}'`];
  conditions.push(`embedding IS NOT NULL`);

  if (contentTypes && contentTypes.length > 0) {
    const types = contentTypes.map((t) => `'${t}'`).join(',');
    conditions.push(`content_type IN (${types})`);
  }
  if (dateFrom) {
    conditions.push(`date_range_start >= '${dateFrom}'::timestamptz`);
  }
  if (dateTo) {
    conditions.push(`date_range_end <= '${dateTo}'::timestamptz`);
  }

  const whereClause = conditions.join(' AND ');

  const results = await prisma.$queryRawUnsafe<RagSearchResult[]>(`
    SELECT
      id,
      client_id AS "clientId",
      content,
      content_type AS "contentType",
      author_agent AS "authorAgent",
      date_range_start AS "dateRangeStart",
      date_range_end AS "dateRangeEnd",
      metadata,
      created_at AS "createdAt",
      1 - (embedding <=> '${vectorStr}'::vector) AS similarity
    FROM rag_documents
    WHERE ${whereClause}
      AND 1 - (embedding <=> '${vectorStr}'::vector) >= ${minSimilarity}
    ORDER BY embedding <=> '${vectorStr}'::vector
    LIMIT ${limit}
  `);

  return results;
}

/**
 * Delete all RAG documents for a client (useful for re-indexing).
 */
export async function deleteClientDocuments(
  clientId: string,
  contentType?: string,
): Promise<number> {
  if (contentType) {
    const result = await prisma.ragDocument.deleteMany({
      where: { clientId, contentType: contentType as Prisma.EnumContentTypeFilter['equals'] },
    });
    return result.count;
  }
  const result = await prisma.ragDocument.deleteMany({ where: { clientId } });
  return result.count;
}

/**
 * Get document count and breakdown for a client.
 */
export async function getClientDocumentStats(clientId: string): Promise<{
  total: number;
  byType: Record<string, number>;
}> {
  const docs = await prisma.ragDocument.groupBy({
    by: ['contentType'],
    where: { clientId },
    _count: true,
  });

  const byType: Record<string, number> = {};
  let total = 0;
  for (const doc of docs) {
    byType[doc.contentType] = doc._count;
    total += doc._count;
  }

  return { total, byType };
}
