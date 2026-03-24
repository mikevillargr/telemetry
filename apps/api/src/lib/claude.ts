import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set.');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeOptions {
  model: string;
  systemPrompt: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
  temperature?: number;
}

export async function callClaude(options: ClaudeOptions): Promise<string> {
  const anthropic = getAnthropicClient();
  const { model, systemPrompt, messages, maxTokens = 4096, temperature = 0.7 } = options;

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  // Extract text from response
  const textBlocks = response.content.filter((block) => block.type === 'text');
  return textBlocks.map((block) => block.text).join('\n');
}
