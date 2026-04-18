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

function applyHeightPlaceholder(geometry: THREE.PlaneGeometry, params: WorldParams): void {
	if (params.terrainShape === 'flat') return;

	const pos = geometry.attributes['position'] as THREE.BufferAttribute;
	const max = params.terrainMaxHeight;

	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const z = pos.getZ(i);

		// Minimal procedural stand-in until real noise is wired
		let y = 0;
		if (params.terrainShape === 'rolling') {
			y = Math.sin(x * 0.05) * Math.cos(z * 0.05) * max;
		} else if (params.terrainShape === 'jagged') {
			y = (Math.abs(Math.sin(x * 0.1)) + Math.abs(Math.sin(z * 0.13))) * max * 0.5;
		} else if (params.terrainShape === 'wavy') {
			y = Math.sin(x * 0.08 + z * 0.06) * max * 0.4;
		}

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
