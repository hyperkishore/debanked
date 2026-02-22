/**
 * AI client abstraction — supports Claude CLI, Anthropic API, and OpenAI API.
 * Server-side only.
 *
 * Priority order:
 * 1. Claude CLI (`claude --print`) — uses existing subscription, no API key needed
 * 2. Anthropic API — requires ANTHROPIC_API_KEY
 * 3. OpenAI API — requires OPENAI_API_KEY
 */

import { spawn, execFile } from "child_process";

interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AIResponse {
  content: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

type Provider = "claude-cli" | "openai" | "anthropic";

// Cache CLI availability with 5-minute TTL
let cliAvailable: boolean | null = null;
let cliCheckedAt = 0;
const CLI_CHECK_TTL_MS = 5 * 60 * 1000;

async function isClaudeCLIAvailable(): Promise<boolean> {
  const now = Date.now();
  if (cliAvailable !== null && now - cliCheckedAt < CLI_CHECK_TTL_MS) {
    return cliAvailable;
  }

  return new Promise((resolve) => {
    execFile("claude", ["--version"], { timeout: 5000 }, (error) => {
      cliAvailable = !error;
      cliCheckedAt = now;
      resolve(cliAvailable);
    });
  });
}

function getAPIProvider(): { provider: Provider; apiKey: string } | null {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (anthropicKey) return { provider: "anthropic", apiKey: anthropicKey };
  if (openaiKey) return { provider: "openai", apiKey: openaiKey };
  return null;
}

/**
 * Call Claude via the CLI using `claude --print`.
 * Uses stdin pipe for the prompt (no argument length limits).
 * Uses --system-prompt flag for proper system prompt handling.
 */
async function callClaudeCLI(messages: AIMessage[]): Promise<AIResponse> {
  const systemMsg = messages.find((m) => m.role === "system");
  const userMsg = messages.find((m) => m.role === "user");
  const userPrompt = userMsg?.content || "";

  const args = ["--print"];
  if (systemMsg) {
    args.push("--system-prompt", systemMsg.content);
  }

  return new Promise((resolve, reject) => {
    const child = spawn("claude", args, {
      timeout: 60000,
      env: { ...process.env, HOME: process.env.HOME || "/Users/kishore" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      reject(new Error(`Claude CLI spawn error: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`Claude CLI exited with code ${code}\nstderr: ${stderr}`)
        );
        return;
      }

      resolve({
        content: stdout.trim(),
        model: "claude-cli",
        usage: { inputTokens: 0, outputTokens: 0 },
      });
    });

    // Write prompt to stdin and close
    child.stdin.write(userPrompt);
    child.stdin.end();
  });
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
    content: data.content?.[0]?.text || "",
    model: data.model,
    usage: {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    },
  };
}

/**
 * Generate a completion using the best available provider.
 * Priority: Claude CLI > Anthropic API > OpenAI API
 */
export async function generateCompletion(
  messages: AIMessage[]
): Promise<AIResponse> {
  // Try Claude CLI first (no API key needed)
  if (await isClaudeCLIAvailable()) {
    return callClaudeCLI(messages);
  }

  // Fall back to API providers
  const config = getAPIProvider();
  if (!config) {
    throw new Error(
      "No AI provider available. Install Claude CLI or set ANTHROPIC_API_KEY / OPENAI_API_KEY."
    );
  }

  if (config.provider === "openai") {
    return callOpenAI(config.apiKey, messages, "gpt-4o-mini");
  } else {
    return callAnthropic(config.apiKey, messages, "claude-haiku-4-5-20251001");
  }
}

/**
 * Check if any AI provider is available.
 */
export async function isAIConfiguredAsync(): Promise<boolean> {
  if (await isClaudeCLIAvailable()) return true;
  return !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

/**
 * Synchronous check — only checks API keys (CLI check is async).
 * Use isAIConfiguredAsync() for full check including CLI.
 */
export function isAIConfigured(): boolean {
  if (cliAvailable === true) return true;
  return !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}
