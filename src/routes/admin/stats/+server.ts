import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { computeStats, fetchRoomsFromRegistry } from '$lib/server/admin-stats';

export const GET: RequestHandler = async ({ cookies, fetch }) => {
	const session = cookies.get('admin_session');
	if (!session || session !== (process.env.ADMIN_TOKEN ?? '')) throw error(401, 'Unauthorized');

	const host  = process.env.PARTYKIT_HOST ?? 'localhost:1999';
	const token = process.env.ADMIN_TOKEN   ?? '';
	const { rooms, registryOnline } = await fetchRoomsFromRegistry(fetch, host, token);
	return json({ ...computeStats(rooms), registryOnline });
};
