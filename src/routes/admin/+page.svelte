<script lang="ts">
	import type { PageData } from './$types';
	import type { Stats } from './+page.server';

	let { data }: { data: PageData } = $props();
	const stats: Stats = data.stats;

	const schemaFields = [
		'consciousness', 'identity', 'time', 'causality', 'meaning',
		'matter', 'life', 'palette', 'density', 'scale', 'geometry', 'light', 'entropy',
	] as const;

	function bar(count: number, total: number): string {
		const pct = total === 0 ? 0 : Math.round((count / total) * 20);
		return '█'.repeat(pct) + '░'.repeat(20 - pct);
	}

	function pct(count: number, total: number): string {
		return total === 0 ? '0%' : `${Math.round((count / total) * 100)}%`;
	}

	function timeAgo(ts: number): string {
		const s = Math.floor((Date.now() - ts) / 1000);
		if (s < 60)   return `${s}s ago`;
		if (s < 3600) return `${Math.floor(s / 60)}m ago`;
		return `${Math.floor(s / 3600)}h ago`;
	}
</script>

<main class="min-h-screen bg-black text-white/60 font-mono p-12">

	<!-- Header -->
	<div class="flex items-baseline justify-between mb-16">
		<h1 class="text-white/20 text-xs uppercase tracking-widest">you. / admin</h1>
		<form method="POST" action="/admin/login?/logout">
			<button type="submit" class="text-white/15 text-xs uppercase tracking-widest hover:text-white/40 transition-colors bg-transparent border-none cursor-pointer">
				logout
			</button>
		</form>
	</div>

	<!-- Overview cards -->
	<div class="grid grid-cols-3 gap-8 mb-20">
		{#each [
			{ label: 'universes created', value: stats.totalRooms },
			{ label: 'active rooms',      value: stats.activeRooms },
			{ label: 'players online',    value: stats.activePlayers },
		] as card}
			<div class="border border-white/8 p-6">
				<p class="text-white text-4xl mb-3">{card.value}</p>
				<p class="text-white/25 text-xs uppercase tracking-widest">{card.label}</p>
			</div>
		{/each}
	</div>

	<!-- Schema distributions -->
	<section class="mb-20">
		<h2 class="text-white/20 text-xs uppercase tracking-widest mb-8">metaphysical distributions</h2>

		{#if stats.totalRooms === 0}
			<p class="text-white/15 text-xs">no universes yet</p>
		{:else}
			<div class="grid grid-cols-2 gap-x-16 gap-y-10">
				{#each schemaFields as field}
					{@const dist = stats.distributions[field]}
					{@const total = stats.totalRooms}
					<div>
						<p class="text-white/30 text-xs uppercase tracking-widest mb-3">{field}</p>
						<div class="space-y-1.5">
							{#each Object.entries(dist).sort((a, b) => b[1] - a[1]) as [val, count]}
								<div class="flex items-baseline gap-3 text-xs">
									<span class="text-white/20 w-20 shrink-0">{val}</span>
									<span class="text-white/15 tracking-tight font-mono text-[10px] leading-none">{bar(count, total)}</span>
									<span class="text-white/30 shrink-0">{pct(count, total)}</span>
									<span class="text-white/15 shrink-0">({count})</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Room list -->
	<section>
		<h2 class="text-white/20 text-xs uppercase tracking-widest mb-8">rooms</h2>

		{#if stats.rooms.length === 0}
			<p class="text-white/15 text-xs">no rooms yet</p>
		{:else}
			<div class="space-y-px">
				<!-- Header row -->
				<div class="grid grid-cols-[6rem_1fr_5rem_6rem_7rem] gap-4 text-white/15 text-[10px] uppercase tracking-widest pb-3 border-b border-white/8">
					<span>room</span>
					<span>schema highlights</span>
					<span>players</span>
					<span>created</span>
					<span>last active</span>
				</div>

				{#each stats.rooms as room (room.roomId)}
					<div class="grid grid-cols-[6rem_1fr_5rem_6rem_7rem] gap-4 py-3 border-b border-white/5 text-xs items-baseline">
						<span class="text-white/40">{room.roomId}</span>

						<div class="flex flex-wrap gap-x-3 gap-y-1">
							{#each ['consciousness', 'time', 'matter', 'life', 'light', 'geometry'] as f}
								<span class="text-white/20">
									<span class="text-white/15">{f.slice(0, 3)}</span>
									<span class="text-white/35">·{room.schema[f as keyof typeof room.schema]}</span>
								</span>
							{/each}
						</div>

						<span class={room.playerCount > 0 ? 'text-white/70' : 'text-white/15'}>
							{room.playerCount}
						</span>

						<span class="text-white/20">{timeAgo(room.createdAt)}</span>
						<span class="text-white/20">{timeAgo(room.lastActive)}</span>
					</div>
				{/each}
			</div>
		{/if}
	</section>

</main>
