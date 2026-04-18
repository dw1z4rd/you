import * as THREE from 'three';
import type { WorldParams } from './types';

export function buildAtmosphere(params: WorldParams, scene: THREE.Scene): void {
	scene.background = new THREE.Color(params.skyColor);
	scene.fog = new THREE.Fog(params.fogColor, params.fogNear, params.fogFar);

	if (!params.particlesEnabled) return;

	const positions = new Float32Array(params.particleCount * 3);
	const spread = params.terrainSize / 2;

	for (let i = 0; i < params.particleCount; i++) {
		positions[i * 3]     = (Math.random() - 0.5) * spread * 2;
		positions[i * 3 + 1] = Math.random() * 60;
		positions[i * 3 + 2] = (Math.random() - 0.5) * spread * 2;
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

	const material = new THREE.PointsMaterial({
		color: params.particleColor,
		size: params.particleSize,
		transparent: true,
		opacity: 0.5,
	});

	scene.add(new THREE.Points(geometry, material));
}
