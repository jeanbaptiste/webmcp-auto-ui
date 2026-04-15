// @webmcp-auto-ui/agent — chat summarization for HyperSkill export

import type { ChatMessage, LLMProvider } from './types.js';

export interface SummarizeOptions {
  messages: ChatMessage[];
  provider: LLMProvider;
  toolsUsed?: string[];
  toolCallCount?: number;
  mcpServers?: { name: string; url: string }[];
  skillsReferenced?: string[];
}

export interface ChatSummaryResult {
  chatSummary: string;
  provenance: {
    mcpServers?: { name: string; url: string }[];
    toolsUsed?: string[];
    toolCallCount?: number;
    skillsReferenced?: string[];
    llm?: string;
    exportedAt: string;
  };
}

export async function summarizeChat(options: SummarizeOptions): Promise<ChatSummaryResult> {
  const { messages, provider, toolsUsed, toolCallCount, mcpServers, skillsReferenced } = options;

  // Build a compact representation of the conversation for the LLM
  const chatText = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => {
      const content = typeof m.content === 'string'
        ? m.content
        : Array.isArray(m.content)
          ? m.content.filter((b: { type: string }) => b.type === 'text').map((b: { type: string; text?: string }) => (b as { text: string }).text).join(' ')
          : '';
      return `${m.role}: ${content}`;
    })
    .join('\n')
    .slice(0, 3000); // cap input to keep costs low

  const prompt = `Summarize this conversation in 2-3 short sentences.
Keep only the user's intent and technical decisions made.
Anonymize EVERYTHING: replace names of people, companies, places, domains, and URLs with generic terms (e.g. "a user", "a company", "a city", "an MCP server").
Never mention personal data.
Reply ONLY with the summary, no preamble.

Conversation:
${chatText}`;

  let chatSummary = '';
  try {
    // LLMProvider.chat() requires tools as second arg — pass empty array for summarization
    const response = await provider.chat(
      [{ role: 'user', content: prompt }],
      [],
      { }
    );

    chatSummary = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join(' ');
  } catch {
    chatSummary = '(summary unavailable)';
  }

  return {
    chatSummary,
    provenance: {
      mcpServers: mcpServers?.length ? mcpServers : undefined,
      toolsUsed: toolsUsed?.length ? [...new Set(toolsUsed)] : undefined,
      toolCallCount,
      skillsReferenced: skillsReferenced?.length ? skillsReferenced : undefined,
      llm: provider.model ?? undefined,
      exportedAt: new Date().toISOString(),
    },
  };
}
