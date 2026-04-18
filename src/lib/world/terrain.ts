import * as THREE from 'three';
import type { WorldParams } from './types';

export interface TerrainMesh {
	mesh: THREE.Mesh;
	geometry: THREE.PlaneGeometry;
}

export function buildTerrain(params: WorldParams, scene: THREE.Scene): TerrainMesh {
	const { terrainSize, terrainSegments } = params;
	const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
	geometry.rotateX(-Math.PI / 2);

	// TODO: replace with noise-based height displacement per terrainShape
	// - 'rolling': smooth simplex noise (low frequency, gentle amplitude)
	// - 'jagged':  ridged noise (high frequency, sharp peaks)
	// - 'wavy':    sin/cos wave composite (animated in updateTerrain)
	// - 'flat':    no displacement
	applyHeightPlaceholder(geometry, params);

	geometry.computeVertexNormals();

	const material = new THREE.MeshStandardMaterial({
		color:            params.terrainColor,
		roughness:        params.terrainRoughness,
		metalness:        params.terrainMetalness,
		emissive:         new THREE.Color(params.terrainEmissive),
		emissiveIntensity:params.terrainEmissiveIntensity,
	});

	applyMatterSolidity(material, params);

	const mesh = new THREE.Mesh(geometry, material);
	mesh.receiveShadow = params.castShadows;
	scene.add(mesh);

	return { mesh, geometry };
}

export function updateTerrain(terrain: TerrainMesh, params: WorldParams, time: number): void {
	if (params.terrainShape !== 'wavy') return;

	// TODO: animate wavy terrain — update vertex y-positions with sin(x + time) + sin(z + time)
	// TODO: call geometry.attributes.position.needsUpdate = true and recompute normals
}

// Value noise: interpolated random grid, much richer than sin/cos
function fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a: number, b: number, t: number): number { return a + t * (b - a); }
function hash(ix: number, iz: number): number {
	let h = (ix * 1619 + iz * 31337) ^ ((ix * 1619 + iz * 31337) >> 16);
	h = Math.imul(h, 0x45d9f3b); h ^= h >> 16;
	return (h & 0xffff) / 0xffff;
}
function valueNoise(x: number, z: number): number {
	const ix = Math.floor(x), iz = Math.floor(z);
	const fx = x - ix, fz = z - iz;
	const ux = fade(fx), uz = fade(fz);
	return lerp(
		lerp(hash(ix, iz),     hash(ix + 1, iz),     ux),
		lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), ux),
		uz,
	) * 2 - 1; // [-1, 1]
}
function fbmNoise(x: number, z: number, octaves: number): number {
	let v = 0, amp = 1, freq = 1, max = 0;
	for (let i = 0; i < octaves; i++) {
		v += amp * valueNoise(x * freq, z * freq);
		max += amp; amp *= 0.5; freq *= 2;
	}
	return v / max;
}

function applyHeightPlaceholder(geometry: THREE.PlaneGeometry, params: WorldParams): void {
	if (params.terrainShape === 'flat') return;

	const pos  = geometry.attributes['position'] as THREE.BufferAttribute;
	const max  = params.terrainMaxHeight;
	const scale = params.terrainShape === 'rolling' ? 0.008
	            : params.terrainShape === 'jagged'  ? 0.018
	            : 0.005;
	const octaves = params.terrainShape === 'jagged' ? 6
	              : params.terrainShape === 'rolling' ? 4 : 2;

	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const z = pos.getZ(i);
		let y = fbmNoise(x * scale, z * scale, octaves) * max;
		if (params.terrainShape === 'jagged') y = Math.abs(y) * (y < 0 ? -0.3 : 1); // ridged
		pos.setY(i, y);
	}

	pos.needsUpdate = true;
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
