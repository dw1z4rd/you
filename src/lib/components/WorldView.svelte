<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import type { WorldParams } from '$lib/world/types';
	import type { PlayerInfo } from '$lib/multiplayer/types';
	import { createScene, createCamera, createRenderer } from '$lib/world/scene';
	import { buildLighting } from '$lib/world/lighting';
	import { buildAtmosphere } from '$lib/world/atmosphere';
	import { buildTerrain, updateTerrain } from '$lib/world/terrain';
	import { PlayerController } from '$lib/world/player';

	let {
		params,
		players = {},
		onPosition,
	}: {
		params: WorldParams;
		players?: Record<string, PlayerInfo>;
		onPosition?: (pos: { x: number; y: number; z: number; rotY: number }) => void;
	} = $props();

	let canvas: HTMLCanvasElement;

	// Mutable snapshot read by the Three.js loop each frame
	let playersSnapshot = players;
	$effect(() => { playersSnapshot = players; });

	onMount(() => {
		const scene    = createScene();
		const camera   = createCamera(params, canvas.clientWidth / canvas.clientHeight);
		const renderer = createRenderer(canvas);

		buildLighting(params, scene);
		buildAtmosphere(params, scene);
		const terrain = buildTerrain(params, scene);
		const player  = new PlayerController(camera, params);

		// Orbs for other players
		const orbs = new Map<string, THREE.Mesh>();
		const orbGeom = new THREE.SphereGeometry(0.4, 12, 8);
		const orbMat  = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			emissive: new THREE.Color(params.bioluminColor || 0x8888ff),
			emissiveIntensity: 2,
			transparent: true,
			opacity: 0.85,
		});

		function syncOrbs() {
			const snap = playersSnapshot;

			// Remove orbs for departed players
			for (const [id, mesh] of orbs) {
				if (!snap[id]) { scene.remove(mesh); orbs.delete(id); }
			}

			// Add orbs for new players, update positions
			for (const [id, info] of Object.entries(snap)) {
				let mesh = orbs.get(id);
				if (!mesh) {
					mesh = new THREE.Mesh(orbGeom, orbMat.clone());
					scene.add(mesh);
					orbs.set(id, mesh);
				}
				mesh.position.set(info.x, info.y, info.z);
			}
		}

		let rafId: number;
		let lastTime = performance.now();
		let frameCount = 0;

		function resize() {
			const w = canvas.clientWidth;
			const h = canvas.clientHeight;
			renderer.setSize(w, h, false);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
		}

		const observer = new ResizeObserver(resize);
		observer.observe(canvas);
		resize();

		function loop(now: number) {
			const delta = Math.min((now - lastTime) / 1000, 0.1);
			lastTime = now;
			frameCount++;

			player.update(delta);
			updateTerrain(terrain, params, now / 1000);
			syncOrbs();
			renderer.render(scene, camera);

			// Report position every ~5 frames (~80ms at 60fps)
			if (frameCount % 5 === 0) onPosition?.(player.getPosition());

			rafId = requestAnimationFrame(loop);
		}

		canvas.addEventListener('click', () => player.lock(canvas));
		rafId = requestAnimationFrame(loop);

		return () => {
			observer.disconnect();
			cancelAnimationFrame(rafId);
			player.dispose();
			orbGeom.dispose();
			renderer.dispose();
		};
	});
</script>

<canvas bind:this={canvas} class="w-full h-full block" />
