/**
 * AI client abstraction — supports OpenAI and Anthropic.
 * Server-side only.
 */

interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AIResponse {
  content: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

type Provider = "openai" | "anthropic";

function getProvider(): { provider: Provider; apiKey: string } | null {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (anthropicKey) return { provider: "anthropic", apiKey: anthropicKey };
  if (openaiKey) return { provider: "openai", apiKey: openaiKey };
  return null;
}

async function callOpenAI(
  apiKey: string,
  messages: AIMessage[],
  model: string
): Promise<AIResponse> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return {
    content: data.choices[0]?.message?.content || "",
    model: data.model,
    usage: {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    },
  };
}

async function callAnthropic(
  apiKey: string,
  messages: AIMessage[],
  model: string
): Promise<AIResponse> {
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      system: systemMsg?.content || "",
      messages: chatMessages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return {
    content:
      data.content?.[0]?.text || "",
    model: data.model,
    usage: {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    },
  };
}

/**
 * Generate a completion using the configured AI provider.
 * Automatically selects the cheapest capable model.
 */
export async function generateCompletion(
  messages: AIMessage[]
): Promise<AIResponse> {
  const config = getProvider();
  if (!config) {
    throw new Error(
      "No AI provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY."
    );
  }

  if (config.provider === "openai") {
    return callOpenAI(config.apiKey, messages, "gpt-4o-mini");
  } else {
    return callAnthropic(config.apiKey, messages, "claude-haiku-4-5-20251001");
  }
}

export function isAIConfigured(): boolean {
  return !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}
