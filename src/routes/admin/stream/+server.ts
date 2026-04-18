import type { RequestHandler } from './$types';
import { computeStats, fetchRoomsFromRegistry } from '$lib/server/admin-stats';

export const GET: RequestHandler = async ({ cookies, fetch }) => {
	const session = cookies.get('admin_session');
	if (!session || session !== (process.env.ADMIN_TOKEN ?? '')) {
		return new Response('Unauthorized', { status: 401 });
	}

	const host  = process.env.PARTYKIT_HOST ?? 'localhost:1999';
	const token = process.env.ADMIN_TOKEN   ?? '';

	let closed = false;

	const stream = new ReadableStream({
		async start(controller) {
			const encode = (data: unknown) =>
				new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);

			const push = async () => {
				if (closed) return;
				const { rooms, registryOnline } = await fetchRoomsFromRegistry(fetch, host, token);
				try {
					controller.enqueue(encode({ ...computeStats(rooms), registryOnline }));
				} catch {
					// Controller closed — stop
					closed = true;
					return;
				}
				if (!closed) setTimeout(push, 3000);
			};

			await push();
		},
		cancel() {
			closed = true;
		},
	});

	return new Response(stream, {
		headers: {
			'Content-Type':  'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection':    'keep-alive',
			'X-Accel-Buffering': 'no', // disable nginx buffering if proxied
		},
	});
};
