<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<main class="min-h-screen bg-black flex items-center justify-center font-mono">
	<div class="w-full max-w-xs">
		<h1 class="text-white/20 text-xs uppercase tracking-widest text-center mb-12">admin</h1>

		<form method="POST" action="?/login" use:enhance class="flex flex-col gap-6">
			<input
				name="password"
				type="password"
				placeholder="password"
				autocomplete="current-password"
				class="bg-transparent border-b border-white/10 text-white/60 text-sm py-2 px-0 outline-none placeholder-white/20 focus:border-white/30 transition-colors"
			/>

			{#if form?.error}
				<p class="text-red-400/50 text-xs">{form.error}</p>
			{/if}

			<button
				type="submit"
				class="text-white/30 text-xs uppercase tracking-widest hover:text-white/70 transition-colors bg-transparent border-none cursor-pointer text-left"
			>
				enter
			</button>
		</form>
	</div>
</main>
