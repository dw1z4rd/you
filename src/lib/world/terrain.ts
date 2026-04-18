import * as THREE from 'three';
import type { WorldParams } from './types';
import { createNoise } from './noise';

export interface TerrainMesh {
	mesh: THREE.Mesh;
	geometry: THREE.PlaneGeometry;
	getHeight: (x: number, z: number) => number;
}

const _noiseCache = new Map<number, ReturnType<typeof createNoise>>();
function getNoise(seed: number) {
	if (!_noiseCache.has(seed)) _noiseCache.set(seed, createNoise(seed));
	return _noiseCache.get(seed)!;
}

export function sampleTerrainHeight(
	x: number,
	z: number,
	params: Pick<WorldParams, 'terrainShape' | 'terrainMaxHeight' | 'terrainNoiseScale' | 'terrainOctaves'>,
	seed: number,
): number {
	if (params.terrainShape === 'flat') return 0;
	const noise = getNoise(seed);
	const nx = x * params.terrainNoiseScale;
	const nz = z * params.terrainNoiseScale;

	switch (params.terrainShape) {
		case 'rolling':
			return noise.fbm(nx, nz, params.terrainOctaves) * params.terrainMaxHeight;
		case 'jagged': {
			let value = 0, amp = 1, freq = 1, max = 0;
			for (let i = 0; i < params.terrainOctaves; i++) {
				value += amp * (1 - Math.abs(noise.simplex2(nx * freq, nz * freq)));
				max += amp; amp *= 0.5; freq *= 2;
			}
			return (value / max) * params.terrainMaxHeight;
		}
		case 'wavy':
			return noise.fbm(nx * 0.5, nz * 0.5, 2) * params.terrainMaxHeight * 0.5;
		default:
			return 0;
	}
}

export function buildTerrain(params: WorldParams, scene: THREE.Scene, seed = 0): TerrainMesh {
	const { terrainSize, terrainSegments } = params;
	const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
	geometry.rotateX(-Math.PI / 2);

	const pos = geometry.attributes['position'] as THREE.BufferAttribute;
	for (let i = 0; i < pos.count; i++) {
		pos.setY(i, sampleTerrainHeight(pos.getX(i), pos.getZ(i), params, seed));
	}
	pos.needsUpdate = true;
	geometry.computeVertexNormals();

	const material = new THREE.MeshStandardMaterial({
		color:             params.terrainColor,
		roughness:         params.terrainRoughness,
		metalness:         params.terrainMetalness,
		emissive:          new THREE.Color(params.terrainEmissive),
		emissiveIntensity: params.terrainEmissiveIntensity,
	});
	applyMatterSolidity(material, params);

	const mesh = new THREE.Mesh(geometry, material);
	mesh.receiveShadow = params.castShadows;
	scene.add(mesh);

	const getHeight = (x: number, z: number) => sampleTerrainHeight(x, z, params, seed);
	return { mesh, geometry, getHeight };
}

export function updateTerrain(terrain: TerrainMesh, params: WorldParams, time: number): void {
	if (params.terrainShape !== 'wavy') return;

	const pos   = terrain.geometry.attributes['position'] as THREE.BufferAttribute;
	const noise = getNoise(0);

	for (let i = 0; i < pos.count; i++) {
		const x  = pos.getX(i);
		const z  = pos.getZ(i);
		const nx = x * params.terrainNoiseScale * 0.5;
		const nz = z * params.terrainNoiseScale * 0.5;
		const base = noise.fbm(nx, nz, 2) * params.terrainMaxHeight * 0.5;
		const wave = Math.sin(x * 0.08 + time * params.timeSpeed) * 0.3
		           + Math.sin(z * 0.06 + time * params.timeSpeed * 1.3) * 0.2;
		pos.setY(i, base + wave * params.terrainMaxHeight * 0.3);
	}

	pos.needsUpdate = true;
	terrain.geometry.computeVertexNormals();
}

function applyMatterSolidity(material: THREE.MeshStandardMaterial, params: WorldParams): void {
	if (params.matterSolidity === 'translucent') {
		material.transparent = true;
		material.opacity = 0.55;
	} else if (params.matterSolidity === 'ghostly') {
		material.transparent = true;
		material.opacity = 0.2;
		material.wireframe = true;
	}
}
