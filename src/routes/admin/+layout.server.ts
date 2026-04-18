import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ cookies, url }) => {
	if (url.pathname === '/admin/login') return {};

	const session  = cookies.get('admin_session');
	const expected = process.env.ADMIN_TOKEN ?? '';

	if (!expected || session !== expected) {
		redirect(303, '/admin/login');
	}
};
