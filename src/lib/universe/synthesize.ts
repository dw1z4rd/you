import type { LLMProvider } from '$lib/llm-agent';
import type { UniverseState, SynthesisResult, UniverseSchema } from './types';

const SYNTHESIS_SYSTEM_PROMPT = `You are the revelation engine of "You." — you synthesize a player's metaphysical axioms into the universe they have created.

Given a list of axioms, you will:
1. Write a 2-3 paragraph narrative description of this universe — in second person, present tense, as if the universe now exists and the reader is standing inside it. Be sensory and specific: what is the quality of light here, of time, of space? Not abstract philosophy — felt reality.
2. Extract a structured schema of parameters for procedural 3D world generation.

CRITICAL: The narrative must faithfully represent each axiom exactly as stated. Do NOT reinterpret, invert, or philosophically rework them. If an axiom says consciousness is the substrate of all that is, the narrative must treat consciousness as primary — not emergent. Every axiom is a hard constraint on the universe you describe. Contradiction is a failure.

Schema fields use only the listed enum values:
- consciousness: "substrate" | "emergent" | "absent"
- identity: "singular" | "distributed" | "fluid"
- time: "linear" | "cyclical" | "absent"
- causality: "deterministic" | "probabilistic" | "absent"
- meaning: "intrinsic" | "constructed" | "absent"
- matter: "primary" | "emergent" | "illusory"
- life: "present" | "absent" | "potential"
- palette: "warm" | "cool" | "monochrome" | "chromatic"
- density: "sparse" | "moderate" | "dense"
- scale: "intimate" | "vast" | "cosmic"
- geometry: "organic" | "crystalline" | "fluid" | "geometric"
- light: "harsh" | "diffuse" | "bioluminescent" | "absent"
- entropy: "low" | "medium" | "high"

Return ONLY valid JSON — no markdown, no explanation:
{"narrative": "...", "schema": { ...all fields... }}`;

export async function synthesizeUniverse(
	state: UniverseState,
	provider: LLMProvider
): Promise<SynthesisResult> {
	const axiomsList = state.answers
		.map((a, i) => `${i + 1}. [${a.domain}] ${a.axiom}`)
		.join('\n');

	const prompt = `Axioms of this universe:\n${axiomsList}\n\nSynthesize.`;

	const raw = await provider.generateText(prompt, {
		systemPrompt: SYNTHESIS_SYSTEM_PROMPT,
		temperature: 0.6,
		maxTokens: 2000
	});

	if (!raw) throw new Error('Synthesis engine returned null');

	// Match outermost {...} — handles markdown code fences and preamble text
	const jsonMatch = raw.match(/\{[\s\S]*\}/);
	if (!jsonMatch) throw new Error(`No JSON in synthesis response. Raw: ${raw.slice(0, 200)}`);

	let parsed: SynthesisResult;
	try {
		parsed = JSON.parse(jsonMatch[0]) as SynthesisResult;
	} catch {
		throw new Error(`Malformed JSON in synthesis response. Raw: ${raw.slice(0, 300)}`);
	}

	if (!parsed.narrative || !parsed.schema) {
		throw new Error(`Synthesis JSON missing narrative or schema fields. Got keys: ${Object.keys(parsed).join(', ')}`);
	}

	return parsed;
}
