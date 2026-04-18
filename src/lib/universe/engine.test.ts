import { describe, it, expect } from 'vitest';
import { generateNextQuestion, deriveAxiom } from './engine';
import type { LLMProvider } from '$lib/llm-agent';
import type { UniverseState } from './types';

const makeQuestionProvider = (question: string, domain: string): LLMProvider => ({
	generateText: async () => JSON.stringify({ question, domain })
});

const makeAxiomProvider = (axiom: string): LLMProvider => ({
	generateText: async () => axiom
});

const nullProvider: LLMProvider = { generateText: async () => null };

const stateWithOneAnswer: UniverseState = {
	answers: [
		{
			question: 'Does the void notice itself?',
			answer: 'yes',
			axiom: 'Consciousness is the substrate of all that is.',
			domain: 'consciousness'
		}
	]
};

describe('generateNextQuestion', () => {
	it('returns the hardcoded first question when state is empty', async () => {
		const state: UniverseState = { answers: [] };
		const result = await generateNextQuestion(state, nullProvider);
		expect(result.question).toBe('Does the void notice itself?');
		expect(result.domain).toBe('consciousness');
	});

	it('calls the provider when state has answers and returns parsed result', async () => {
		const provider = makeQuestionProvider('Is there more than one?', 'multiplicity');
		const result = await generateNextQuestion(stateWithOneAnswer, provider);
		expect(result.question).toBe('Is there more than one?');
		expect(result.domain).toBe('multiplicity');
	});

	it('extracts JSON even when provider wraps it in a code block', async () => {
		const provider: LLMProvider = {
			generateText: async () =>
				'```json\n{"question": "Does time have a direction?", "domain": "causality"}\n```'
		};
		const result = await generateNextQuestion(stateWithOneAnswer, provider);
		expect(result.question).toBe('Does time have a direction?');
		expect(result.domain).toBe('causality');
	});

	it('throws when provider returns null and state has answers', async () => {
		await expect(generateNextQuestion(stateWithOneAnswer, nullProvider)).rejects.toThrow(
			'Question engine returned null'
		);
	});

	it('throws when provider returns text with no JSON object', async () => {
		const badProvider: LLMProvider = { generateText: async () => 'no json here' };
		await expect(generateNextQuestion(stateWithOneAnswer, badProvider)).rejects.toThrow(
			'No JSON found in question response'
		);
	});
});

describe('deriveAxiom', () => {
	it('returns the trimmed axiom string', async () => {
		const provider = makeAxiomProvider('  Consciousness is the substrate of all that is.  ');
		const state: UniverseState = { answers: [] };
		const axiom = await deriveAxiom('Does the void notice itself?', 'yes', state, provider);
		expect(axiom).toBe('Consciousness is the substrate of all that is.');
	});

	it('includes prior axioms in the prompt sent to the provider', async () => {
		let capturedPrompt = '';
		const provider: LLMProvider = {
			generateText: async (prompt) => {
				capturedPrompt = prompt;
				return 'Time flows in one direction only.';
			}
		};
		await deriveAxiom('Does time have a direction?', 'yes', stateWithOneAnswer, provider);
		expect(capturedPrompt).toContain('Consciousness is the substrate of all that is.');
	});

	it('throws when provider returns null', async () => {
		const state: UniverseState = { answers: [] };
		await expect(
			deriveAxiom('Does the void notice itself?', 'yes', state, nullProvider)
		).rejects.toThrow('Axiom engine returned null');
	});
});
