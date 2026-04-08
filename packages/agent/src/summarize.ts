// @webmcp-auto-ui/agent — chat summarization for HyperSkill export

import type { ChatMessage, LLMProvider } from './types.js';

export interface SummarizeOptions {
  messages: ChatMessage[];
  provider: LLMProvider;
  toolsUsed?: string[];
  toolCallCount?: number;
  mcpServers?: string[];
  skillsReferenced?: string[];
}

export interface ChatSummaryResult {
  chatSummary: string;
  provenance: {
    mcpServers?: string[];
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

  const prompt = `Résume cette conversation en 2-3 phrases courtes.
Garde uniquement l'intention de l'utilisateur et les décisions techniques prises.
Anonymise TOUT : remplace les noms de personnes, d'entreprises, de lieux, de domaines et d'URLs par des termes génériques (ex: "un utilisateur", "une entreprise", "une ville", "un serveur MCP").
Ne mentionne jamais de données personnelles.
Réponds UNIQUEMENT avec le résumé, sans préambule.

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
    chatSummary = '(synthèse non disponible)';
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
