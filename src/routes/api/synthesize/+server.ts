import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { synthesizeUniverse } from '$lib/universe/synthesize';
import { llm } from '$lib/server/provider';
import type { UniverseState } from '$lib/universe/types';

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as { state: UniverseState };

	try {
		const result = await synthesizeUniverse(body.state, llm);
		return json(result);
	} catch (e) {
		throw error(500, e instanceof Error ? e.message : 'Synthesis failed');
	}
};
