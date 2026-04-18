import { createOllamaProvider, withRetry } from '$lib/llm-agent';

export const llm = withRetry(
	createOllamaProvider({
		model: process.env.OLLAMA_MODEL ?? 'llama3.2',
		baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
	}),
	{ maxRetries: 3 }
);
