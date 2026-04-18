<script lang="ts">
	import type { UniverseState, Answer } from '$lib/universe/types';

	type GamePhase = 'intro' | 'waiting' | 'processing' | 'revealing' | 'void';

	let phase = $state<GamePhase>('intro');
	let universe = $state<UniverseState>({ answers: [] });
	let currentQuestion = $state('');
	let currentDomain = $state('');
	let pendingAxiom = $state('');
	let showAxioms = $state(false);
	let err = $state<string | null>(null);

	function begin() {
		currentQuestion = 'Does the void notice itself?';
		currentDomain = 'consciousness';
		phase = 'waiting';
	}

	async function answer(choice: string) {
		if (phase !== 'waiting') return;
		err = null;

		if (universe.answers.length === 0 && choice === 'no') {
			phase = 'void';
			return;
		}

		phase = 'processing';

		try {
			const axiomRes = await fetch('/api/axiom', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ question: currentQuestion, answer: choice, state: universe })
			});
			if (!axiomRes.ok) throw new Error(`Axiom route returned ${axiomRes.status}`);
			const { axiom } = (await axiomRes.json()) as { axiom: string };

			const newAnswer: Answer = {
				question: currentQuestion,
				answer: choice,
				axiom,
				domain: currentDomain
			};
			universe = { answers: [...universe.answers, newAnswer] };
			pendingAxiom = axiom;
			phase = 'revealing';

			await sleep(3000);

			phase = 'processing';
			const qRes = await fetch('/api/question', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ state: universe })
			});
			if (!qRes.ok) throw new Error(`Question route returned ${qRes.status}`);
			const { question, domain } = (await qRes.json()) as { question: string; domain: string };

			currentQuestion = question;
			currentDomain = domain;
			pendingAxiom = '';
			phase = 'waiting';
		} catch (e) {
			err = e instanceof Error ? e.message : 'Something went wrong';
			phase = 'waiting';
		}
	}

	function sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
</script>

<main class="min-h-screen bg-black flex flex-col items-center justify-center p-8 font-mono select-none">
	{#if phase === 'intro'}
		<div class="text-center">
			<h1 class="text-6xl text-white mb-20 tracking-widest" style="opacity: 0.85">You.</h1>
			<button
				onclick={begin}
				class="text-white/30 text-xs tracking-widest hover:text-white/70 transition-colors duration-500 cursor-pointer border-none bg-transparent uppercase"
			>
				begin
			</button>
		</div>

	{:else if phase === 'void'}
		<div class="text-center max-w-md">
			<p class="text-white/25 text-base leading-loose tracking-wide">
				The void does not notice itself.<br />
				Nothing emerges.<br />
				<br />
				This too is a universe.
			</p>
		</div>

	{:else if phase === 'revealing'}
		<div class="text-center max-w-lg">
			<p class="text-white/20 text-xs uppercase tracking-widest mb-8">{currentDomain}</p>
			<p class="text-white/70 text-base leading-relaxed italic">{pendingAxiom}</p>
		</div>

	{:else}
		<div class="text-center max-w-lg w-full">
			<p class="text-white/20 text-xs uppercase tracking-widest mb-12">{currentDomain}</p>
			<p class="text-white text-xl leading-relaxed mb-20 min-h-16">
				{currentQuestion}
			</p>

			{#if phase === 'waiting'}
				<div class="flex gap-16 justify-center">
					<button
						onclick={() => answer('yes')}
						class="text-white/40 text-xs tracking-widest uppercase hover:text-white transition-colors duration-300 cursor-pointer bg-transparent border-none"
					>
						yes
					</button>
					<button
						onclick={() => answer('no')}
						class="text-white/40 text-xs tracking-widest uppercase hover:text-white transition-colors duration-300 cursor-pointer bg-transparent border-none"
					>
						no
					</button>
				</div>
			{:else}
				<p class="text-white/15 text-xs tracking-widest animate-pulse">. . .</p>
			{/if}
		</div>
	{/if}

	{#if universe.answers.length > 0}
		<div class="fixed bottom-6 right-6">
			<button
				onclick={() => (showAxioms = !showAxioms)}
				class="text-white/20 text-xs tracking-widest hover:text-white/50 transition-colors bg-transparent border-none cursor-pointer"
			>
				{showAxioms ? 'hide' : `${universe.answers.length} axiom${universe.answers.length !== 1 ? 's' : ''}`}
			</button>
		</div>
	{/if}

	{#if showAxioms}
		<div class="fixed bottom-16 right-6 max-w-xs border border-white/10 p-4 text-right bg-black">
			{#each universe.answers as a}
				<div class="mb-3">
					<p class="text-white/20 text-[10px] uppercase tracking-widest mb-1">{a.domain}</p>
					<p class="text-white/40 text-xs leading-relaxed">{a.axiom}</p>
				</div>
			{/each}
		</div>
	{/if}

	{#if err}
		<div class="fixed top-4 left-1/2 -translate-x-1/2 text-red-400/50 text-xs font-mono">
			{err}
		</div>
	{/if}
</main>
