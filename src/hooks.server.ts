// Load .env file in local Node.js dev only — not needed on Cloudflare (vars come from dashboard)
if (import.meta.env.DEV) {
	try {
		const [{ readFileSync }, { resolve }] = await Promise.all([
			import('node:fs'),
			import('node:path'),
		]);
		const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
		for (const line of raw.split('\n')) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;
			const eq = trimmed.indexOf('=');
			if (eq === -1) continue;
			const key = trimmed.slice(0, eq).trim();
			const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
			if (key) process.env[key] = val;
		}
	} catch { /* .env not found or not in Node.js */ }
}

export const handle = async ({ event, resolve }) => resolve(event);
