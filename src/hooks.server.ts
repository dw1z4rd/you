import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env');
console.log('[env] cwd:', process.cwd());
console.log('[env] reading from:', envPath);

try {
	const raw = readFileSync(envPath, 'utf-8');
	console.log('[env] file found, byte length:', raw.length);

	for (const line of raw.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
		if (!key) continue;
		process.env[key] = val;
		console.log(`[env] ${key} = "${val}" (set)`);
	}
} catch (e) {
	console.error('[env] failed to read .env:', e);
}

export const handle = async ({ event, resolve }) => {
	console.log('[hook] request:', event.request.method, event.url.pathname);
	console.log('[hook] ADMIN_TOKEN in process.env:', process.env.ADMIN_TOKEN ?? '(not set)');
	return resolve(event);
};
