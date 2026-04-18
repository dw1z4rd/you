<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { page } from '$app/stores';
	import WorldView from '$lib/components/WorldView.svelte';
	import type { WorldParams } from '$lib/world/types';
	import type { SynthesisResult } from '$lib/universe/types';
	import type { PlayerInfo } from '$lib/multiplayer/types';
	import { RoomClient } from '$lib/multiplayer/client';
	import { schemaToWorld } from '$lib/world/schema-to-world';

	const roomId     = $page.url.searchParams.get('room');
	const ownerSecret = $page.url.searchParams.get('secret');

	let params         = $state<WorldParams | null>(null);
	let error          = $state<string | null>(null);
	let isOwner        = $state(false);
	let myId           = $state('');
	let players        = $state<Record<string, PlayerInfo>>({});
	let permissions    = $state<string[]>([]);
	let pendingReqs    = $state<string[]>([]);
	let shareUrl       = $state('');
	let copied         = $state(false);
	let client         = $state<RoomClient | null>(null);

	let hasPermission  = $derived(permissions.includes(myId));

	onMount(() => {
		if (!roomId) { error = 'No room ID in URL.'; return; }

		shareUrl = `${window.location.origin}/world?room=${roomId}`;

		const host = (import.meta.env.PUBLIC_PARTYKIT_HOST as string | undefined) ?? 'localhost:1999';
		const room = new RoomClient(roomId, host);
		client = room;

		room.onPlayerJoined = (player) => {
			players = { ...players, [player.id]: player };
		};

		room.onPlayerLeft = (id) => {
			const { [id]: _, ...rest } = players;
			players = rest;
			pendingReqs = pendingReqs.filter(r => r !== id);
		};

		room.onPlayerPosition = (id, x, y, z, rotY) => {
			if (players[id]) players = { ...players, [id]: { ...players[id], x, y, z, rotY } };
		};

		room.onPermissionRequest = (id) => {
			if (!pendingReqs.includes(id)) pendingReqs = [...pendingReqs, id];
		};

		room.onPermissionsUpdate = (perms) => {
			permissions = perms;
		};

		room.onError = (msg) => { error = msg; };

		// Load synthesis once — used by both the join message and the fallback
		let synthesis: SynthesisResult | null = null;
		try {
			const raw = localStorage.getItem('you_synthesis');
			if (raw) synthesis = JSON.parse(raw);
		} catch { /* ignore */ }

		// Fall back to solo (no multiplayer) if PartyKit doesn't respond in 6s
		const fallbackTimer = setTimeout(() => {
			if (params) return;
			room.dispose();
			client = null;
			if (!synthesis) { error = 'No universe found. Begin again.'; return; }
			params = schemaToWorld(synthesis.schema);
			isOwner = true;
		}, 6000);

		room.onWelcome = ({ yourId, isOwner: io, state, players: ps }) => {
			clearTimeout(fallbackTimer);
			myId = yourId;
			isOwner = io;
			permissions = state.permissions;
			params = schemaToWorld(state.schema);
			players = ps;
		};

		if (ownerSecret) {
			room.join({
				ownerSecret,
				schema:    synthesis?.schema,
				universe:  { answers: [] },
				synthesis,
			});
		} else {
			room.join();
		}

		return () => { clearTimeout(fallbackTimer); room.dispose(); };
	});

	function handlePosition(pos: { x: number; y: number; z: number; rotY: number }) {
		client?.sendPosition(pos);
	}

	function grant(id: string) {
		client?.grantPermission(id);
		pendingReqs = pendingReqs.filter(r => r !== id);
	}

	function deny(id: string) {
		pendingReqs = pendingReqs.filter(r => r !== id);
	}

	function revoke(id: string) {
		client?.revokePermission(id);
	}

	async function copyLink() {
		await navigator.clipboard.writeText(shareUrl);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="w-screen h-screen bg-black overflow-hidden relative font-mono select-none">

	{#if params}
		<!-- 3D world -->
		<div class="w-full h-full" in:fade={{ duration: 2000 }}>
			<WorldView {params} {players} onPosition={handlePosition} />
		</div>

		<!-- Hint -->
		<p class="absolute top-4 left-1/2 -translate-x-1/2 text-white/10 text-xs tracking-widest pointer-events-none">
			click to look · wasd to move · esc to release
		</p>

		<!-- Share link (top-right) -->
		<div class="absolute top-4 right-4 flex items-center gap-3">
			<button
				onclick={copyLink}
				class="text-white/20 text-xs tracking-widest uppercase hover:text-white/60 transition-colors bg-transparent border-none cursor-pointer"
			>
				{copied ? 'copied' : 'copy invite link'}
			</button>
		</div>

		<!-- Owner: permission panel (bottom-right) -->
		{#if isOwner}
			<div class="absolute bottom-6 right-6 text-right space-y-4 max-w-xs">

				<!-- Pending permission requests -->
				{#each pendingReqs as id (id)}
					<div class="border border-white/10 p-3" in:fade={{ duration: 300 }} out:fade={{ duration: 200 }}>
						<p class="text-white/30 text-[10px] uppercase tracking-widest mb-2">access request</p>
						<p class="text-white/50 text-xs mb-3 break-all">{id.slice(0, 8)}…</p>
						<div class="flex gap-4 justify-end">
							<button onclick={() => deny(id)}  class="text-white/20 text-xs uppercase tracking-widest hover:text-white/50 transition-colors bg-transparent border-none cursor-pointer">deny</button>
							<button onclick={() => grant(id)} class="text-white/50 text-xs uppercase tracking-widest hover:text-white/90 transition-colors bg-transparent border-none cursor-pointer">grant</button>
						</div>
					</div>
				{/each}

				<!-- Connected visitors with permission -->
				{#each Object.values(players).filter(p => !p.isOwner) as p (p.id)}
					<div class="flex items-center gap-3 justify-end">
						<span class="text-white/20 text-[10px] tracking-widest">{p.id.slice(0, 8)}…</span>
						{#if permissions.includes(p.id)}
							<button onclick={() => revoke(p.id)} class="text-white/40 text-[10px] uppercase tracking-widest hover:text-red-400/60 transition-colors bg-transparent border-none cursor-pointer">revoke</button>
						{:else}
							<button onclick={() => grant(p.id)} class="text-white/20 text-[10px] uppercase tracking-widest hover:text-white/50 transition-colors bg-transparent border-none cursor-pointer">grant</button>
						{/if}
					</div>
				{/each}

			</div>
		{/if}

		<!-- Visitor: role badge + request button (bottom-right) -->
		{#if !isOwner}
			<div class="absolute bottom-6 right-6 text-right space-y-2">
				{#if hasPermission}
					<p class="text-white/30 text-xs tracking-widest">edit access granted</p>
				{:else}
					<button
						onclick={() => client?.requestPermission()}
						class="text-white/20 text-xs tracking-widest uppercase hover:text-white/60 transition-colors bg-transparent border-none cursor-pointer"
					>
						request edit access
					</button>
				{/if}
			</div>
		{/if}

		<!-- Visitor count (bottom-left) -->
		{#if Object.keys(players).length > 0}
			<p class="absolute bottom-6 left-6 text-white/10 text-xs tracking-widest">
				{Object.keys(players).length} other{Object.keys(players).length !== 1 ? 's' : ''} here
			</p>
		{/if}

	{:else if error}
		<div class="flex flex-col items-center justify-center h-full gap-6" in:fade={{ duration: 600 }}>
			<p class="text-white/30 text-sm">{error}</p>
			<a href="/" class="text-white/20 text-xs tracking-widest uppercase hover:text-white/50 transition-colors">begin again</a>
		</div>

	{:else}
		<div class="flex items-center justify-center h-full">
			<p class="text-white/10 text-xs tracking-widest animate-pulse">entering</p>
		</div>
	{/if}

</div>
