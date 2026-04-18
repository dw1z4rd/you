import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const data     = await request.formData();
		const password = data.get('password')?.toString() ?? '';
		const expected = process.env.ADMIN_TOKEN ?? '';

		if (!expected) return fail(500, { error: 'ADMIN_TOKEN not configured on server.' });
		if (password !== expected) return fail(401, { error: 'Incorrect password.' });

		cookies.set('admin_session', expected, {
			path:     '/admin',
			httpOnly: true,
			sameSite: 'strict',
			maxAge:   60 * 60 * 8, // 8 hours
		});

		redirect(303, '/admin');
	},

	logout: async ({ cookies }) => {
		cookies.delete('admin_session', { path: '/admin' });
		redirect(303, '/admin/login');
	},
};
