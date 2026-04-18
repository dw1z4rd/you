import type { LLMProvider } from '$lib/llm-agent';
import type { UniverseState, QuestionResult } from './types';

const FIRST_QUESTION: QuestionResult = {
	question: 'Does the void notice itself?',
	domain: 'consciousness'
};

const QUESTION_SYSTEM_PROMPT = `You are the cosmogonic engine of "You." — a philosophical game where a universe crystallizes from a player's answers.

Your role: examine the metaphysical axioms established so far and generate the single next question most directly entailed by them.

RULES:
- Questions must follow logically from prior answers — each question is necessitated by what is already established
- Questions address the fundamental structure of existence: consciousness, causality, time, identity, matter, multiplicity, meaning, will, finitude, relation
- Phrase each question directly to the player in second person ("Do you...?" / "Are you...?" / "Is there...?")
- Questions must have exactly two possible answers — yes/no, or a forced choice between two ontological positions stated explicitly
- Do not revisit a domain already covered by a prior axiom
- Questions grow progressively more specific as axioms accumulate

Return ONLY valid JSON — no markdown, no explanation, no code fences:
{"question": "...", "domain": "..."}`;

const AXIOM_SYSTEM_PROMPT = `You are the axiom engine of "You." — you translate a player's answer into a precise metaphysical truth that governs their universe.

RULES:
- State the axiom as a present-tense declarative fact ("Consciousness is the substrate of all that is")
- It must follow logically from the answer given to the question asked
- It must cohere with all prior axioms — no contradictions
- Be specific and concrete, not vague or platitudinous
- 1-2 sentences maximum

Return ONLY the axiom as plain text. No JSON, no explanation, no preamble.`;

export async function generateNextQuestion(
	state: UniverseState,
	provider: LLMProvider
): Promise<QuestionResult> {
	if (state.answers.length === 0) return FIRST_QUESTION;

	const axiomsSummary = state.answers
		.map((a, i) => `${i + 1}. [${a.domain}] ${a.axiom}`)
		.join('\n');

	const prompt = `Established axioms of this universe:\n${axiomsSummary}\n\nWhat is the next question?`;

	const raw = await provider.generateText(prompt, {
		systemPrompt: QUESTION_SYSTEM_PROMPT,
		temperature: 0.7,
		maxTokens: 200
	});

	if (!raw) throw new Error('Question engine returned null');

	const jsonMatch = raw.match(/\{[\s\S]*?\}/);
	if (!jsonMatch) throw new Error('No JSON found in question response');

	const parsed = JSON.parse(jsonMatch[0]) as { question: string; domain: string };
	return { question: parsed.question, domain: parsed.domain };
}

export async function deriveAxiom(
	question: string,
	answer: string,
	state: UniverseState,
	provider: LLMProvider
): Promise<string> {
	const priorAxioms =
		state.answers.length > 0 ? state.answers.map((a) => `- ${a.axiom}`).join('\n') : '(none yet)';

	const prompt = `Prior axioms:\n${priorAxioms}\n\nQuestion asked: "${question}"\nAnswer given: "${answer}"\n\nDerive the axiom.`;

	const axiom = await provider.generateText(prompt, {
		systemPrompt: AXIOM_SYSTEM_PROMPT,
		temperature: 0.5,
		maxTokens: 150
	});

	if (!axiom) throw new Error('Axiom engine returned null');
	return axiom.trim();
}
