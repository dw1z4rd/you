<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import type { UniverseState, Answer, SynthesisResult } from '$lib/universe/types';
	import { generateRoomId, generateSecret } from '$lib/multiplayer/client';

	const SYNTHESIS_THRESHOLD = 14;
	const TYPEWRITER_SPEED_MS = 28;

	type GamePhase = 'intro' | 'waiting' | 'processing' | 'revealing' | 'void' | 'synthesizing' | 'complete';

	let phase = $state<GamePhase>('intro');
	let universe = $state<UniverseState>({ answers: [] });
	let currentQuestion = $state('');
	let currentDomain = $state('');
	let currentChoices = $state<[string, string]>(['yes', 'no']);
	let pendingAxiom = $state('');
	let showAxioms = $state(false);
	let err = $state<string | null>(null);
	let synthesis = $state<SynthesisResult | null>(null);

	// Typewriter
	let displayedQuestion = $state('');
	let isTyping = $state(false);
	let typewriterTimer: ReturnType<typeof setInterval> | null = null;

	// Clear displayed text whenever the source question changes
	$effect(() => {
		currentQuestion;
		displayedQuestion = '';
		isTyping = false;
		if (typewriterTimer) { clearInterval(typewriterTimer); typewriterTimer = null; }
	});

	// Start typewriter when we enter waiting phase
	$effect(() => {
		if (phase === 'waiting' && currentQuestion) {
			let i = 0;
			isTyping = true;
			typewriterTimer = setInterval(() => {
				i++;
				displayedQuestion = currentQuestion.slice(0, i);
				if (i >= currentQuestion.length) {
					clearInterval(typewriterTimer!);
					typewriterTimer = null;
					isTyping = false;
				}
			}, TYPEWRITER_SPEED_MS);
		}
		return () => {
			if (typewriterTimer) { clearInterval(typewriterTimer); typewriterTimer = null; }
		};
	});

	function begin() {
		currentQuestion = 'Does the void notice itself?';
		currentDomain = 'consciousness';
		currentChoices = ['yes', 'no'];
		phase = 'waiting';
	}

	async function answer(choice: string) {
		if (phase !== 'waiting' || isTyping) return;
		err = null;

		if (universe.answers.length === 0 && choice === currentChoices[1]) {
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

			universe = { answers: [...universe.answers, { question: currentQuestion, answer: choice, axiom, domain: currentDomain } satisfies Answer] };
			pendingAxiom = axiom;
			phase = 'revealing';

			await sleep(3000);

			if (universe.answers.length >= SYNTHESIS_THRESHOLD) {
				phase = 'synthesizing';
				const synthRes = await fetch('/api/synthesize', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ state: universe })
				});
				if (!synthRes.ok) throw new Error(`Synthesis route returned ${synthRes.status}`);
				synthesis = (await synthRes.json()) as SynthesisResult;
				phase = 'complete';
				return;
			}

			phase = 'processing';
			const qRes = await fetch('/api/question', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ state: universe })
			});
			if (!qRes.ok) throw new Error(`Question route returned ${qRes.status}`);
			const { question, domain, choices } = (await qRes.json()) as {
				question: string;
				domain: string;
				choices?: [string, string];
			};

			currentQuestion = question;
			currentDomain = domain;
			currentChoices = choices ?? ['yes', 'no'];
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

	function enterWorld() {
		if (!synthesis) return;
		localStorage.setItem('you_synthesis', JSON.stringify(synthesis));
		const room   = generateRoomId();
		const secret = generateSecret();
		goto(`/world?room=${room}&secret=${secret}`);
	}
</script>

<main class="min-h-screen bg-black flex flex-col items-center justify-center p-8 font-mono select-none">

	{#if phase === 'intro'}
		<div class="text-center" in:fade={{ duration: 1000 }} out:fade={{ duration: 400 }}>
			<h1 class="text-6xl text-white mb-20 tracking-widest" style="opacity: 0.85">You.</h1>
			<button
				onclick={begin}
				class="text-white/30 text-xs tracking-widest hover:text-white/70 transition-colors duration-500 cursor-pointer border-none bg-transparent uppercase"
			>
				begin
			</button>
		</div>

	{:else if phase === 'void'}
		<div class="text-center max-w-md" in:fade={{ duration: 1500, delay: 300 }}>
			<p class="text-white/25 text-base leading-loose tracking-wide">
				The void does not notice itself.<br />
				Nothing emerges.<br />
				<br />
				This too is a universe.
			</p>
		</div>

	{:else if phase === 'revealing'}
		<div class="text-center max-w-lg" in:fade={{ duration: 700 }} out:fade={{ duration: 400 }}>
			<p class="text-white/20 text-xs uppercase tracking-widest mb-8">{currentDomain}</p>
			<p class="text-white/70 text-base leading-relaxed italic">{pendingAxiom}</p>
		</div>

	{:else if phase === 'synthesizing'}
		<div in:fade={{ duration: 800 }} out:fade={{ duration: 400 }}>
			<p class="text-white/20 text-xs uppercase tracking-widest animate-pulse">crystallizing</p>
		</div>

	{:else if phase === 'complete' && synthesis}
		<div class="text-center max-w-2xl" in:fade={{ duration: 2000, delay: 400 }}>
			<p class="text-white/20 text-xs uppercase tracking-widest mb-16">your universe</p>
			<div class="text-white/75 text-base leading-relaxed space-y-6 text-left">
				{#each synthesis.narrative.split('\n\n') as paragraph}
					<p>{paragraph}</p>
				{/each}
			</div>
			<div class="mt-16 border-t border-white/10 pt-8 flex items-center justify-between">
				<p class="text-white/15 text-xs tracking-widest uppercase">{universe.answers.length} axioms</p>
				<button
					onclick={enterWorld}
					class="text-white/30 text-xs tracking-widest uppercase hover:text-white/70 transition-colors duration-500 cursor-pointer border-none bg-transparent"
				>
					enter
				</button>
			</div>
		</div>

	{:else}
		<!-- waiting | processing -->
		<div class="text-center max-w-lg w-full">

			{#key currentDomain}
				<p class="text-white/20 text-xs uppercase tracking-widest mb-12"
					in:fade={{ duration: 500 }}>
					{currentDomain}
				</p>
			{/key}

			{#key currentQuestion}
				<p class="text-white text-xl leading-relaxed mb-20 min-h-16"
					in:fly={{ y: 20, duration: 600, opacity: 0 }}
					out:fade={{ duration: 200 }}>
					{displayedQuestion}{#if isTyping}<span class="text-white/25">▌</span>{/if}
				</p>
			{/key}

			{#if phase === 'waiting' && !isTyping}
				<div class="flex gap-16 justify-center" in:fade={{ duration: 500, delay: 100 }}>
					{#each currentChoices as choice}
						<button
							onclick={() => answer(choice)}
							class="text-white/40 text-xs tracking-widest uppercase hover:text-white transition-colors duration-300 cursor-pointer bg-transparent border-none"
						>
							{choice}
						</button>
					{/each}
				</div>
			{:else if phase === 'processing'}
				<p class="text-white/15 text-xs tracking-widest animate-pulse"
					in:fade={{ duration: 300 }}
					out:fade={{ duration: 300 }}>
					. . .
				</p>
			{/if}

		</div>
	{/if}

	{#if universe.answers.length > 0 && phase !== 'complete'}
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
		<div class="fixed bottom-16 right-6 max-w-xs border border-white/10 p-4 text-right bg-black"
			in:fade={{ duration: 300 }} out:fade={{ duration: 200 }}>
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
