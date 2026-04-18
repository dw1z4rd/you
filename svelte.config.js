import adapterNode from '@sveltejs/adapter-node';
import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Cloudflare Pages sets CF_PAGES=1 in its build environment
const adapter = process.env.CF_PAGES === '1' ? adapterCloudflare() : adapterNode();

const config = {
	preprocess: vitePreprocess(),
	kit: { adapter }
};

export default config;
