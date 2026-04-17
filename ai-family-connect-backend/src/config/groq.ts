import axios from "axios";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface GroqCallOptions {
  model?: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: any }>;
  temperature?: number;
  max_tokens?: number;
}

export async function callGroq(options: GroqCallOptions): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("[Groq] GROQ_API_KEY is not configured.");

  const {
    model = "llama-3.3-70b-versatile",
    messages,
    temperature = 0.5,
    max_tokens = 1024,
  } = options;

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model,
        messages,
        temperature,
        max_tokens,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const text = response.data?.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) throw new Error("[Groq] Received an empty response.");
    return text.trim();
  } catch (err: any) {
    const message = err.response?.data?.error?.message || err.message;
    throw new Error(`[Groq] API request failed: ${message}`);
  }
}

export function stripGroqMarkdown(raw: string): string {
  const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return match ? match[0] : raw.trim();
}

export function parseGroqJSON<T>(raw: string): T {
  const cleaned = stripGroqMarkdown(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(`[Groq] JSON Parse failed: ${cleaned.slice(0, 100)}...`);
  }
}
