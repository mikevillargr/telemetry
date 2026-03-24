import { pipeline, Tensor } from '@xenova/transformers';

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIMENSIONS = 384;

let extractor: any = null;
let loadingPromise: Promise<any> | null = null;

/**
 * Lazy-load the local embedding model. Cached after first call.
 * Model is ~30MB, downloaded once to ~/.cache/huggingface/
 */
async function getExtractor(): Promise<any> {
  if (extractor) return extractor;
  if (loadingPromise) return loadingPromise;

  loadingPromise = pipeline('feature-extraction', MODEL_NAME as any, {
    quantized: true, // use quantized ONNX model for speed
  });

  extractor = await loadingPromise;
  loadingPromise = null;
  console.log(`✓ Local embedding model loaded: ${MODEL_NAME} (${EMBEDDING_DIMENSIONS}d)`);
  return extractor;
}

function meanPool(tensor: Tensor): number[] {
  const data = tensor.data as Float32Array;
  const [, seqLen, hiddenSize] = tensor.dims;
  const result = new Float64Array(hiddenSize);

  for (let i = 0; i < seqLen; i++) {
    for (let j = 0; j < hiddenSize; j++) {
      result[j] += data[i * hiddenSize + j];
    }
  }

  // Average and normalize
  const output: number[] = new Array(hiddenSize);
  let norm = 0;
  for (let j = 0; j < hiddenSize; j++) {
    output[j] = result[j] / seqLen;
    norm += output[j] * output[j];
  }
  norm = Math.sqrt(norm);
  for (let j = 0; j < hiddenSize; j++) {
    output[j] /= norm;
  }

  return output;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const ext = await getExtractor();
  const output = await ext(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array).slice(0, EMBEDDING_DIMENSIONS);
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const ext = await getExtractor();
  const results: number[][] = [];

  // Process one at a time (local model, no batching API)
  for (const text of texts) {
    const output = await ext(text, { pooling: 'mean', normalize: true });
    results.push(Array.from(output.data as Float32Array).slice(0, EMBEDDING_DIMENSIONS));
  }

  return results;
}

export function vectorToSql(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

export { EMBEDDING_DIMENSIONS };
