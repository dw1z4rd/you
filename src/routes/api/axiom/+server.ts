import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deriveAxiom } from '$lib/universe/engine';
import { llm } from '$lib/server/provider';
import type { UniverseState } from '$lib/universe/types';

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as {
		question: string;
		answer: string;
		state: UniverseState;
	};

	try {
		const axiom = await deriveAxiom(body.question, body.answer, body.state, llm);
		return json({ axiom });
	} catch (e) {
		throw error(500, e instanceof Error ? e.message : 'Axiom derivation failed');
	}
};
