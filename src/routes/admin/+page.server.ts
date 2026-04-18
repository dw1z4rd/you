import type { PageServerLoad } from './$types';
import { computeStats, fetchRoomsFromRegistry, type Stats } from '$lib/server/admin-stats';

export type { Stats };

export const load: PageServerLoad = async ({ fetch }) => {
	const host  = process.env.PARTYKIT_HOST ?? 'localhost:1999';
	const token = process.env.ADMIN_TOKEN   ?? '';
	const { rooms, registryOnline } = await fetchRoomsFromRegistry(fetch, host, token);
	return { stats: { ...computeStats(rooms), registryOnline } };
};
