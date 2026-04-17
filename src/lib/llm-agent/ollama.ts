import type {
  LLMProvider,
  LLMOptions,
  OllamaProviderConfig,
  OpenAIResponse,
} from "./types";
import { redactKey } from "./utils";

function filterThinkingTags(text: string): string {
  let filtered = text
    .replace(/\s*<thinking>[\s\S]*?<\/thinking>\s*/gi, " ")
    .replace(/\s*<think>[\s\S]*?<\/think>\s*/gi, " ")
    .replace(/\s*<reasoning>[\s\S]*?<\/reasoning>\s*/gi, " ")
    .replace(/\s*<thought>[\s\S]*?<\/thought>\s*/gi, " ")
    .replace(/\s*<analysis>[\s\S]*?<\/analysis>\s*/gi, " ")
    .replace(
      /\s*<\/?\s*(thinking|think|reasoning|thought|analysis)[^>]*>?/gi,
      "",
    );

  return filtered
    .replace(/ {2,}/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
}

const DEFAULT_MODEL = "llama3.2";
const DEFAULT_BASE_URL = "http://localhost:11434";

export const createOllamaProvider = (
  config: OllamaProviderConfig = {},
): LLMProvider => ({
  generateText: async (
    prompt: string,
    options?: LLMOptions,
  ): Promise<string | null> => {
    const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    const url = `${baseUrl}/v1/chat/completions`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`;

    const body = JSON.stringify({
      model: config.model ?? DEFAULT_MODEL,
      messages: [
        ...(options?.systemPrompt != null
          ? [{ role: "system", content: options.systemPrompt }]
          : []),
        { role: "user", content: prompt },
      ],
      ...(options?.maxTokens != null ? { max_tokens: options.maxTokens } : {}),
      ...(options?.temperature != null
        ? { temperature: options.temperature }
        : {}),
      stream: !!options?.onToken,
      ...(config.extraBody ?? {}),
    });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: options?.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        const safe = config.apiKey ? redactKey(text, config.apiKey) : text;
        console.error(
          `[Ollama] API Error ${response.status}:`,
          safe.slice(0, 500),
        );
        return null;
      }

      if (options?.onToken) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let fullText = "";
        let finishReason: string | null = null;
        let isInThinkingBlock = false;

        const processLine = (line: string): boolean => {
          if (!line.startsWith("data: ")) return false;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") return true;
          try {
            const chunk = JSON.parse(payload) as OpenAIResponse & {
              choices?: Array<{
                delta?: { content?: string };
                finish_reason?: string | null;
              }> & { error?: unknown };
            };
            if ((chunk as any).error) {
              console.error(
                `[Ollama] Error in stream payload (model=${config.model ?? DEFAULT_MODEL}):`,
                JSON.stringify((chunk as any).error).slice(0, 500),
              );
              return false;
            }
            const choice = (chunk.choices as any)?.[0];
            const token: string = choice?.delta?.content ?? "";
            if (token) {
              if (!isInThinkingBlock) {
                const lowerToken = token.toLowerCase();
                if (
                  lowerToken.includes("<thinking>") ||
                  lowerToken.includes("<think>") ||
                  lowerToken.includes("<reasoning>") ||
                  lowerToken.includes("<thought>") ||
                  lowerToken.includes("<analysis>") ||
                  lowerToken.includes("<tool_call>")
                ) {
                  isInThinkingBlock = true;
                  return false;
                }
                fullText += token;
                options?.onToken?.(token);
              } else {
                const lowerToken = token.toLowerCase();
                if (
                  lowerToken.includes("</thinking>") ||
                  lowerToken.includes("</think>") ||
                  lowerToken.includes("</reasoning>") ||
                  lowerToken.includes("</thought>") ||
                  lowerToken.includes("</analysis>") ||
                  lowerToken.includes("</tool_call>")
                ) {
                  isInThinkingBlock = false;
                  if (fullText.length > 0 && !/\s$/.test(fullText)) {
                    fullText += " ";
                    options?.onToken?.(" ");
                  }
                }
                return false;
              }
            }
            if (choice?.finish_reason != null)
              finishReason = choice.finish_reason;
          } catch {
            console.error(
              `[Ollama] Unparseable stream chunk (model=${config.model ?? DEFAULT_MODEL}): ${payload.slice(0, 300)}`,
            );
          }
          return false;
        };

        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) {
            const remaining = (buf + decoder.decode()).trim();
            if (remaining) {
              console.log(
                `[Ollama] buf had ${remaining.length} unprocessed bytes at stream end`,
              );
              processLine(remaining);
            }
            break;
          }
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (processLine(line)) break outer;
          }
        }

        const model = config.model ?? DEFAULT_MODEL;
        if (finishReason === "length") {
          console.warn(
            `[Ollama] Stream ended: finish_reason=length, chars=${fullText.length}, maxTokens=${options?.maxTokens ?? "unset"} — model ${model} hit output cap`,
          );
        } else {
          console.log(
            `[Ollama] Stream ended: finish_reason=${finishReason ?? "unknown"}, chars=${fullText.length}, maxTokens=${options?.maxTokens ?? "unset"}, model=${model}`,
          );
        }

        const filteredText = filterThinkingTags(fullText || "");
        return filteredText || null;
      }

      const data = (await response.json()) as OpenAIResponse;
      const rawText = data.choices?.[0]?.message?.content ?? null;
      return rawText;
    } catch (e: any) {
      if (e.name === "AbortError") {
        console.log(
          `[Ollama] Request aborted for model ${config.model ?? DEFAULT_MODEL}`,
        );
        return null;
      }

      const msg = e.message || String(e);
      const safe = config.apiKey ? redactKey(msg, config.apiKey) : msg;
      console.error(
        `[Ollama] Network Error: Unable to connect to ${url}. Is the server reachable? (${safe})`,
      );
      return null;
    }
  },
});
