import { NormalizedData } from '@gr-bi/shared';

export interface DocumentChunk {
  content: string;
  contentType: 'data_pull' | 'report' | 'recommendation' | 'strategy' | 'onboarding_brief' | 'trends_digest';
  metadata: Record<string, unknown>;
  dateRangeStart?: string;
  dateRangeEnd?: string;
}

const MAX_CHUNK_SIZE = 2000; // characters per chunk

/**
 * Convert NormalizedData from a connector pull into text chunks suitable for embedding.
 * Each chunk is a self-contained narrative about a slice of the data.
 */
export function chunkNormalizedData(data: NormalizedData, clientName?: string): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const { connectorType, rows, dateRange, metadata } = data;

  if (!rows || rows.length === 0) return chunks;

  // Group rows by date
  const byDate = new Map<string, typeof rows>();
  for (const row of rows) {
    const date = row.date;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(row);
  }

  // Create a summary chunk for the entire pull
  const summaryLines: string[] = [];
  summaryLines.push(`Data Source: ${connectorLabel(connectorType)}`);
  if (clientName) summaryLines.push(`Client: ${clientName}`);
  summaryLines.push(`Date Range: ${dateRange.start} to ${dateRange.end}`);
  summaryLines.push(`Total Rows: ${rows.length}`);

  // Aggregate top-level metrics
  const agg = aggregateMetrics(rows);
  if (Object.keys(agg).length > 0) {
    summaryLines.push('');
    summaryLines.push('Aggregated Metrics:');
    for (const [key, val] of Object.entries(agg)) {
      summaryLines.push(`  ${formatMetricName(key)}: ${formatNumber(val)}`);
    }
  }

  chunks.push({
    content: summaryLines.join('\n'),
    contentType: 'data_pull',
    metadata: { connectorType, source: 'summary', ...metadata },
    dateRangeStart: dateRange.start,
    dateRangeEnd: dateRange.end,
  });

  // Create per-date chunks (batch dates if needed to stay under MAX_CHUNK_SIZE)
  let currentBatch: string[] = [];
  let currentBatchDates: string[] = [];

  const sortedDates = Array.from(byDate.keys()).sort();
  for (const date of sortedDates) {
    const dateRows = byDate.get(date)!;
    const dateLines = formatDateChunk(date, dateRows, connectorType, clientName);
    const dateText = dateLines.join('\n');

    if (currentBatch.join('\n').length + dateText.length > MAX_CHUNK_SIZE && currentBatch.length > 0) {
      // Flush current batch
      chunks.push({
        content: currentBatch.join('\n\n'),
        contentType: 'data_pull',
        metadata: {
          connectorType,
          source: 'daily_detail',
          dates: currentBatchDates,
          ...metadata,
        },
        dateRangeStart: currentBatchDates[0],
        dateRangeEnd: currentBatchDates[currentBatchDates.length - 1],
      });
      currentBatch = [];
      currentBatchDates = [];
    }

    currentBatch.push(dateText);
    currentBatchDates.push(date);
  }

  // Flush remaining
  if (currentBatch.length > 0) {
    chunks.push({
      content: currentBatch.join('\n\n'),
      contentType: 'data_pull',
      metadata: {
        connectorType,
        source: 'daily_detail',
        dates: currentBatchDates,
        ...metadata,
      },
      dateRangeStart: currentBatchDates[0],
      dateRangeEnd: currentBatchDates[currentBatchDates.length - 1],
    });
  }

  return chunks;
}

/**
 * Chunk plain text (e.g., from file uploads, reports) into fixed-size segments.
 */
export function chunkText(
  text: string,
  contentType: DocumentChunk['contentType'],
  metadata: Record<string, unknown> = {},
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const paragraphs = text.split(/\n\n+/);
  let current = '';

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > MAX_CHUNK_SIZE && current.length > 0) {
      chunks.push({ content: current.trim(), contentType, metadata });
      current = '';
    }
    current += (current ? '\n\n' : '') + para;
  }

  if (current.trim()) {
    chunks.push({ content: current.trim(), contentType, metadata });
  }

  return chunks;
}

/**
 * Chunk CSV text into structured text segments.
 */
export function chunkCsv(
  csvText: string,
  description: string,
  metadata: Record<string, unknown> = {},
): DocumentChunk[] {
  const lines = csvText.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const dataLines = lines.slice(1);
  const chunks: DocumentChunk[] = [];

  // Summary chunk
  chunks.push({
    content: `Uploaded Data: ${description}\nColumns: ${headers.join(', ')}\nTotal Rows: ${dataLines.length}`,
    contentType: 'data_pull',
    metadata: { source: 'upload', description, columns: headers, ...metadata },
  });

  // Batch rows into chunks
  let batch: string[] = [];
  let batchText = '';

  for (const line of dataLines) {
    const values = line.split(',').map((v) => v.trim());
    const rowText = headers.map((h, i) => `${h}: ${values[i] || 'N/A'}`).join(', ');

    if (batchText.length + rowText.length + 2 > MAX_CHUNK_SIZE && batch.length > 0) {
      chunks.push({
        content: `${description} (rows ${chunks.length * 20 + 1}–${chunks.length * 20 + batch.length}):\n${batch.join('\n')}`,
        contentType: 'data_pull',
        metadata: { source: 'upload', description, ...metadata },
      });
      batch = [];
      batchText = '';
    }

    batch.push(rowText);
    batchText += rowText + '\n';
  }

  if (batch.length > 0) {
    chunks.push({
      content: `${description} (remaining rows):\n${batch.join('\n')}`,
      contentType: 'data_pull',
      metadata: { source: 'upload', description, ...metadata },
    });
  }

  return chunks;
}

// --- Helpers ---

function formatDateChunk(
  date: string,
  rows: Array<{ dimensions?: Record<string, string>; metrics: Record<string, number> }>,
  connectorType: string,
  clientName?: string,
): string[] {
  const lines: string[] = [];
  lines.push(`[${connectorLabel(connectorType)}] ${date}${clientName ? ` — ${clientName}` : ''}`);

  for (const row of rows) {
    const dimStr = row.dimensions
      ? Object.entries(row.dimensions).map(([k, v]) => `${k}=${v}`).join(', ')
      : '';
    const metricStr = Object.entries(row.metrics)
      .map(([k, v]) => `${formatMetricName(k)}: ${formatNumber(v)}`)
      .join(', ');
    lines.push(`  ${dimStr ? dimStr + ' → ' : ''}${metricStr}`);
  }

  return lines;
}

function aggregateMetrics(rows: Array<{ metrics: Record<string, number> }>): Record<string, number> {
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  const rateKeys = new Set(['bounceRate', 'conversionRate', 'ctr', 'avgPosition', 'avgSessionDuration']);

  for (const row of rows) {
    for (const [key, val] of Object.entries(row.metrics)) {
      if (typeof val !== 'number') continue;
      sums[key] = (sums[key] || 0) + val;
      counts[key] = (counts[key] || 0) + 1;
    }
  }

  const result: Record<string, number> = {};
  for (const [key, sum] of Object.entries(sums)) {
    result[key] = rateKeys.has(key) ? Math.round((sum / counts[key]) * 100) / 100 : sum;
  }
  return result;
}

function connectorLabel(type: string): string {
  const labels: Record<string, string> = {
    ga4: 'Google Analytics 4',
    gsc: 'Google Search Console',
    meta: 'Meta Ads',
    semrush: 'SEMrush',
    brave: 'Brave Search API',
    upload: 'Manual Upload',
  };
  return labels[type] || type;
}

function formatMetricName(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
}

function formatNumber(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val % 1 === 0 ? val.toString() : val.toFixed(2);
}
